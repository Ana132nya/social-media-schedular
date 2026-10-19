# LinkedIn OAuth and scheduled publishing setup

## 1. Create a LinkedIn app

Create an application in the [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps). In the app's **Products** tab, request and enable **Share on LinkedIn**. This provides the `w_member_social` permission used to create member posts.

## 2. Register the callback URL

Open the app's **Auth** tab and add the exact callback URL used by SocialFlow:

```text
https://your-domain.example/api/linkedin/callback
```

LinkedIn requires an absolute HTTPS callback URL. For local development, expose the backend through an HTTPS tunnel and use that public URL for both the LinkedIn app setting and `LINKEDIN_REDIRECT_URI`.

## 3. Configure the backend

Copy `.env.example` to `.env` in the `backend` directory and add your LinkedIn app credentials:

```dotenv
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_REDIRECT_URI=https://your-domain.example/api/linkedin/callback
LINKEDIN_API_VERSION=202606
```

The redirect URL must match the URL registered with LinkedIn exactly. Update `LINKEDIN_API_VERSION` when LinkedIn publishes a newer supported Posts API version.

## 4. Connect the account

Start the backend and frontend, sign in to SocialFlow, open **Accounts**, and select **Connect LinkedIn**. Approve the requested permissions in LinkedIn. SocialFlow stores the access token encrypted in MongoDB and displays only the connected account name and token expiry in the interface.

## Publishing behavior

When a scheduled LinkedIn post is due, SocialFlow publishes its caption as a public member post using LinkedIn's Posts API. LinkedIn image attachments need the separate Images API upload and asset-registration flow; they are not included in this connection setup.

References: [LinkedIn authorization-code flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow) and [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api).
