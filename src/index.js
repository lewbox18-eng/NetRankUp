require("dotenv").config();

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const APPLICATION_BUTTON_ID = "netrankup_apply_button";
const APPLICATION_MODAL_ID = "netrankup_apply_modal";
const REJECT_MODAL_PREFIX = "netrankup_reject_modal";

const required = [
  "DISCORD_TOKEN",
  "APPLICATION_REVIEW_CHANNEL_ID",
  "GUILD_ID"
];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

function buildPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0x2b6cb0)
    .setTitle("NetRankUp Moderator Applications")
    .setDescription(
      "Want to help run the server? Press the button below and fill out the application form."
    );
}

function buildPanelRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(APPLICATION_BUTTON_ID)
      .setLabel("Apply for Moderator")
      .setStyle(ButtonStyle.Primary)
  );
}

function buildReviewRow(userId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`netrankup_approve:${userId}`)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`netrankup_reject:${userId}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
}

function buildApplicationEmbed({ user, answers, status }) {
  return new EmbedBuilder()
    .setColor(0xf6ad55)
    .setTitle("New NetRankUp Mod Application")
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      {
        name: "Applicant",
        value: `${user} (${user.tag})\nID: ${user.id}`
      },
      { name: "Age", value: answers.age },
      { name: "Timezone", value: answers.timezone },
      { name: "Experience", value: answers.experience },
      { name: "Availability", value: answers.availability },
      { name: "Why do you want to be a moderator?", value: answers.reason },
      { name: "Status", value: status }
    )
    .setTimestamp();
}

function buildUpdatedEmbed(existingEmbed, nextStatus, color) {
  const embed = EmbedBuilder.from(existingEmbed);
  const fields = embed.data.fields ?? [];
  const filteredFields = fields.filter((field) => field.name !== "Status");

  embed.setColor(color);
  embed.setFields([...filteredFields, { name: "Status", value: nextStatus }]);

  return embed;
}

function buildCelebrationMessage(userId) {
  return `:tada: :confetti_ball: Congratulations <@${userId}>! Your NetRankUp moderator application was approved! :confetti_ball: :tada:`;
}

function isReviewer(member) {
  if (!member) {
    return false;
  }

  if (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild)
  ) {
    return true;
  }

  const reviewerRoleId = process.env.STAFF_REVIEWER_ROLE_ID;
  return reviewerRoleId ? member.roles.cache.has(reviewerRoleId) : false;
}

function buildApplicationModal() {
  const modal = new ModalBuilder()
    .setCustomId(APPLICATION_MODAL_ID)
    .setTitle("NetRankUp Mod Application");

  const ageInput = new TextInputBuilder()
    .setCustomId("age")
    .setLabel("How old are you?")
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(20)
    .setRequired(true);

  const timezoneInput = new TextInputBuilder()
    .setCustomId("timezone")
    .setLabel("What timezone are you in?")
    .setStyle(TextInputStyle.Short)
    .setMinLength(2)
    .setMaxLength(40)
    .setRequired(true);

  const experienceInput = new TextInputBuilder()
    .setCustomId("experience")
    .setLabel("What moderation experience do you have?")
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(1)
    .setMaxLength(400)
    .setRequired(true);

  const availabilityInput = new TextInputBuilder()
    .setCustomId("availability")
    .setLabel("How often can you help each week?")
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(1)
    .setMaxLength(300)
    .setRequired(true);

  const reasonInput = new TextInputBuilder()
    .setCustomId("reason")
    .setLabel("Why should we pick you?")
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(1)
    .setMaxLength(600)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(ageInput),
    new ActionRowBuilder().addComponents(timezoneInput),
    new ActionRowBuilder().addComponents(experienceInput),
    new ActionRowBuilder().addComponents(availabilityInput),
    new ActionRowBuilder().addComponents(reasonInput)
  );

  return modal;
}

function buildRejectModal(userId, messageId) {
  const modal = new ModalBuilder()
    .setCustomId(`${REJECT_MODAL_PREFIX}:${userId}:${messageId}`)
    .setTitle("Reject Application");

  const reasonInput = new TextInputBuilder()
    .setCustomId("rejection_reason")
    .setLabel("Why is this application being rejected?")
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(1)
    .setMaxLength(500)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
  return modal;
}

async function sendDecisionDm(user, text) {
  try {
    await user.send(text);
  } catch (error) {
    console.warn(`Could not DM ${user.tag}: ${error.message}`);
  }
}

client.once("clientReady", () => {
  console.log(`NetRankUp is online as ${client.user.tag}.`);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "apply") {
        await interaction.showModal(buildApplicationModal());
        return;
      }

      if (interaction.commandName === "setup-applications") {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
          await interaction.reply({
            content: "You need the Manage Server permission to do that.",
            ephemeral: true
          });
          return;
        }

        await interaction.channel.send({
          embeds: [buildPanelEmbed()],
          components: [buildPanelRow()]
        });

        await interaction.reply({
          content: "The NetRankUp application panel is now live in this channel.",
          ephemeral: true
        });
      }

      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === APPLICATION_BUTTON_ID) {
        await interaction.showModal(buildApplicationModal());
        return;
      }

      if (interaction.customId.startsWith("netrankup_approve:")) {
        if (!isReviewer(interaction.member)) {
          await interaction.reply({
            content: "Only staff reviewers can approve applications.",
            ephemeral: true
          });
          return;
        }

        const [, userId] = interaction.customId.split(":");
        const guildMember = await interaction.guild.members
          .fetch(userId)
          .catch(() => null);

        if (!guildMember) {
          await interaction.reply({
            content: "That applicant is no longer in the server.",
            ephemeral: true
          });
          return;
        }

        const moderatorRoleId = process.env.MODERATOR_ROLE_ID;
        let roleText = "No moderator role was configured.";
        const botMember = interaction.guild.members.me;

        if (moderatorRoleId) {
          const role = interaction.guild.roles.cache.get(moderatorRoleId);

          if (!role) {
            roleText = "The configured moderator role could not be found.";
          } else if (guildMember.roles.cache.has(role.id)) {
            roleText = `${guildMember} already has ${role}.`;
          } else if (
            !botMember?.permissions.has(PermissionFlagsBits.ManageRoles)
          ) {
            roleText = `Approved, but I need the Manage Roles permission before I can give ${role}.`;
          } else if (botMember.roles.highest.position <= role.position) {
            roleText = `Approved, but my bot role must be above ${role} in the server role list before I can give it.`;
          } else {
            try {
              await guildMember.roles.add(role);
              roleText = `Granted role ${role}.`;
            } catch (error) {
              console.error("Could not grant the moderator role:", error);
              roleText = `Approved, but I couldn't give ${role}. Check my role permissions and role order.`;
            }
          }
        }

        const reviewerTag = interaction.user.tag;
        const reviewedAt = Math.floor(Date.now() / 1000);
        const nextStatus = `Approved by ${reviewerTag}\n${roleText}\nReviewed: <t:${reviewedAt}:F>`;

        const updatedEmbed = buildUpdatedEmbed(
          interaction.message.embeds[0],
          nextStatus,
          0x38a169
        );

        await interaction.update({
          embeds: [updatedEmbed],
          components: [buildReviewRow(userId, true)]
        });

        await sendDecisionDm(
          guildMember.user,
          `Your NetRankUp moderator application was approved in ${interaction.guild.name}.`
        );

        const announcementChannelId =
          process.env.APPROVAL_ANNOUNCEMENT_CHANNEL_ID ||
          process.env.APPLICATION_REVIEW_CHANNEL_ID;
        const announcementChannel = await client.channels
          .fetch(announcementChannelId)
          .catch(() => null);

        if (announcementChannel?.isTextBased()) {
          await announcementChannel
            .send({
              content: buildCelebrationMessage(userId)
            })
            .catch((error) => {
              console.error("Could not post the approval celebration message:", error);
            });
        }

        return;
      }

      if (interaction.customId.startsWith("netrankup_reject:")) {
        if (!isReviewer(interaction.member)) {
          await interaction.reply({
            content: "Only staff reviewers can reject applications.",
            ephemeral: true
          });
          return;
        }

        const [, userId] = interaction.customId.split(":");
        await interaction.showModal(buildRejectModal(userId, interaction.message.id));
        return;
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === APPLICATION_MODAL_ID) {
        await interaction.deferReply({ ephemeral: true });

        const reviewChannel = await client.channels
          .fetch(process.env.APPLICATION_REVIEW_CHANNEL_ID)
          .catch(() => null);

        if (!reviewChannel || !reviewChannel.isTextBased()) {
          await interaction.editReply({
            content:
              "The review channel is missing or not text-based. Check the bot configuration.",
          });
          return;
        }

        const answers = {
          age: interaction.fields.getTextInputValue("age"),
          timezone: interaction.fields.getTextInputValue("timezone"),
          experience: interaction.fields.getTextInputValue("experience"),
          availability: interaction.fields.getTextInputValue("availability"),
          reason: interaction.fields.getTextInputValue("reason")
        };

        const reviewerPing = process.env.STAFF_REVIEWER_ROLE_ID
          ? `<@&${process.env.STAFF_REVIEWER_ROLE_ID}>`
          : null;

        try {
          await reviewChannel.send({
            content: reviewerPing ?? undefined,
            embeds: [
              buildApplicationEmbed({
                user: interaction.user,
                answers,
                status: "Pending review"
              })
            ],
            components: [buildReviewRow(interaction.user.id)]
          });
        } catch (error) {
          console.error("Could not send application to the review channel:", error);
          await interaction.editReply({
            content:
              "I couldn't post your application to the review channel. Check the bot's channel permissions and review channel ID.",
          });
          return;
        }

        await interaction.editReply({
          content:
            "Your application has been sent to the staff team. NetRankUp will be in touch soon.",
        });

        return;
      }

      if (interaction.customId.startsWith(`${REJECT_MODAL_PREFIX}:`)) {
        if (!isReviewer(interaction.member)) {
          await interaction.reply({
            content: "Only staff reviewers can reject applications.",
            ephemeral: true
          });
          return;
        }

        await interaction.deferReply({ ephemeral: true });

        const [, userId, messageId] = interaction.customId.split(":");
        const rejectionReason = interaction.fields.getTextInputValue("rejection_reason");
        const reviewMessage = await interaction.channel.messages
          .fetch(messageId)
          .catch(() => null);

        if (!reviewMessage) {
          await interaction.editReply({
            content: "I couldn't find the original application message.",
          });
          return;
        }

        const applicant = await client.users.fetch(userId).catch(() => null);
        const reviewedAt = Math.floor(Date.now() / 1000);
        const nextStatus = `Rejected by ${interaction.user.tag}\nReason: ${rejectionReason}\nReviewed: <t:${reviewedAt}:F>`;

        const updatedEmbed = buildUpdatedEmbed(
          reviewMessage.embeds[0],
          nextStatus,
          0xe53e3e
        );

        await reviewMessage.edit({
          embeds: [updatedEmbed],
          components: [buildReviewRow(userId, true)]
        });

        if (applicant) {
          await sendDecisionDm(
            applicant,
            `Your NetRankUp moderator application was rejected in ${interaction.guild.name}.\nReason: ${rejectionReason}`
          );
        }

        await interaction.editReply({
          content: "The application was rejected and the applicant has been notified.",
        });
      }
    }
  } catch (error) {
    console.error("Interaction handler error:", error);

    if (interaction.isRepliable() && interaction.deferred) {
      await interaction
        .editReply({
          content: "Something went wrong while handling that action."
        })
        .catch(() => null);
      return;
    }

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Something went wrong while handling that action.",
        ephemeral: true
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
