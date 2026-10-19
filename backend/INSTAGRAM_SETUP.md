# Instagram publishing setup

1. Create a Meta app with the Instagram API and Instagram Login use case. Add an Instagram Business or Creator account as a tester while the app is in development.
2. Add `http://localhost:5173/api/instagram/callback` to the app's allowed redirect URLs. Use the deployed HTTPS URL in production.
3. Copy `.env.example` to `.env` and set `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, and `INSTAGRAM_REDIRECT_URI`.
4. Set `PUBLIC_BASE_URL` to the public HTTPS URL of this backend, such as `https://api.example.com`. Instagram must fetch uploaded images from this address; it cannot access localhost.
5. Start the backend and frontend, sign into SocialFlow, open **Accounts**, and select **Connect Instagram**.

The scheduler creates an Instagram media container and then publishes it when an Instagram image post is due. Access tokens are encrypted before storage in MongoDB.

See Meta's [Instagram publishing guide](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/content-publishing/) for account type, permission, and publishing requirements.

# LinkedIn publishing setup

1. Create a LinkedIn Developer application and request access to the **Share on LinkedIn** product, which grants the `w_member_social` scope.
2. In the app's Auth settings, register `https://your-domain/api/linkedin/callback`. LinkedIn requires an HTTPS callback URL, so local development needs an HTTPS tunnel or deployed URL.
3. Set `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, and `LINKEDIN_REDIRECT_URI` in `.env`. Set `LINKEDIN_API_VERSION` to a currently supported Posts API version if the default has been superseded.
4. Open **Accounts** in SocialFlow and choose **Connect LinkedIn**.

Scheduled LinkedIn posts publish their caption as a public member post. LinkedIn image uploads require its separate Images API flow.

See LinkedIn's [authorization-code flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow) and [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api) documentation.
