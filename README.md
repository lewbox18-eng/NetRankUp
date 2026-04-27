# NetRankUp

`NetRankUp` is a Discord bot for moderator applications.

## What it does

- Lets users apply with `/apply` or through a button panel.
- Sends each application to a private review channel.
- Gives staff approve and reject buttons.
- Optionally assigns the moderator role on approval.
- DMs the applicant with the decision.

## Setup

1. Install dependencies:

   ```powershell
   npm.cmd install
   ```

2. Create a `.env` file based on `.env.example`.

3. Register the slash commands:

   ```powershell
   node src/registerCommands.js
   ```

4. Start the bot:

   ```powershell
   node src/index.js
   ```

## Environment variables

- `DISCORD_TOKEN`: your bot token
- `CLIENT_ID`: your bot application ID
- `GUILD_ID`: your Discord server ID
- `APPLICATION_REVIEW_CHANNEL_ID`: the private staff review channel
- `MODERATOR_ROLE_ID`: role given after approval
- `STAFF_REVIEWER_ROLE_ID`: optional role allowed to approve or reject applications
- `APPROVAL_ANNOUNCEMENT_CHANNEL_ID`: optional channel for approval celebration messages

If `STAFF_REVIEWER_ROLE_ID` is empty, users with `Manage Server` or `Administrator` can review applications.

## Using the bot

1. Run `/setup-applications` in the channel where people should see the application button.
2. Users click the button or run `/apply`.
3. Staff review the application in the review channel.
4. Approve or reject the application from the action buttons.

## Keep it online 24/7

To keep NetRankUp online when your PC is off, run it on a hosted service instead of your computer.

### Railway

1. Push this project to GitHub.
2. Create a new Railway project and connect the GitHub repo.
3. Add the same environment variables from your local `.env` file in Railway's Variables tab.
4. Deploy the service.
5. If Railway asks for a start command, use:

   ```bash
   npm start
   ```

Railway can keep a persistent service running, which is what a Discord bot needs.

### Docker-compatible hosts

This project now includes a `Dockerfile`, so you can also deploy it to any host that supports Docker.
