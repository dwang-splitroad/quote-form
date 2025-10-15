# Dropbox Team Space Integration Setup

## Required Dropbox App Configuration

To upload PDFs to the team space `/Quotes/` folder, you must create a Dropbox app with **Full Dropbox** access and specific team-level permissions. In the Dropbox App Console (https://www.dropbox.com/developers/apps), create or configure your app with these exact scopes under the **Permissions** tab: `files.content.write`, `files.content.read`, `sharing.read`, `members.read`, and `team_info.read`. After enabling all permissions, click **Submit** and then generate a new access token from the **Settings** tab. This token will be a team-level token that allows access to team member accounts.

## Required Environment Variables

Four environment variables are required in your `.env.local` file for team space access:

1. **DROPBOX_ACCESS_TOKEN**: The team-level token generated from your Dropbox app's Settings tab
2. **DROPBOX_TEAM_MEMBER_ID**: The team member ID (format: `dbmid:XXXXX`) - obtain this by calling the Dropbox API endpoint `team/members/list_v2` with your token
3. **DROPBOX_ROOT_NAMESPACE**: The team space root namespace ID (numeric string like `"12565321969"`) - get this by calling `users/get_current_account` with the `selectUser` parameter set to your team member ID, which returns `root_info.root_namespace_id`
4. **SENDGRID_API_KEY**: Your SendGrid API key for sending emails

Example `.env.local` file:
```
DROPBOX_ACCESS_TOKEN=your_team_token_here
DROPBOX_TEAM_MEMBER_ID=dbmid:XXXXX
DROPBOX_ROOT_NAMESPACE=12565321969
SENDGRID_API_KEY=SG.XXXXX
```

These variables enable the system to upload PDFs to the shared team space folder at https://www.dropbox.com/home/Quotes.

