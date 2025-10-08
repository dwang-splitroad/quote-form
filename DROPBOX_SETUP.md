# Dropbox Team Space Integration Setup

## Required Dropbox App Configuration

To upload PDFs to the team space `/Jobs/Quotes/` folder, you must create a Dropbox app with **Full Dropbox** access and specific team-level permissions. In the Dropbox App Console (https://www.dropbox.com/developers/apps), create or configure your app with these exact scopes under the **Permissions** tab: `files.content.write`, `files.content.read`, `sharing.read`, `members.read`, and `team_info.read`. After enabling all permissions, click **Submit** and then generate a new access token from the **Settings** tab. This token will be a team-level token that allows access to team member accounts.

## Required Environment Variables

Four environment variables are required in your `.env.local` file for team space access. `DROPBOX_ACCESS_TOKEN` is the team-level token generated from your app. `DROPBOX_TEAM_MEMBER_ID` is the team member ID (format: `dbmid:XXXXX`) of the account through which files will be uploaded - obtain this by calling the Dropbox API endpoint `team/members/list_v2` with your token, which returns all team members with their `team_member_id` values. `DROPBOX_ROOT_NAMESPACE` is the team space root namespace ID (a numeric value like `12565321969`) - get this by calling `users/get_current_account` with the `selectUser` parameter set to your team member ID, which returns `root_info.root_namespace_id`. Together, these three Dropbox variables plus `SENDGRID_API_KEY` enable the system to upload PDFs to the shared team space folder that all team members can access at https://www.dropbox.com/home/Jobs/Quotes.

