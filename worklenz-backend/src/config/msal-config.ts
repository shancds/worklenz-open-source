import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";
import { log_error } from "../shared/utils";

class MSALConfig {
  private static instance: ConfidentialClientApplication | null = null;

  public static getInstance(): ConfidentialClientApplication {
    if (!MSALConfig.instance) {
      MSALConfig.instance = MSALConfig.createInstance();
    }
    return MSALConfig.instance;
  }

  private static createInstance(): ConfidentialClientApplication {
    const clientConfig: Configuration = {
      auth: {
        clientId: process.env.MICROSOFT_SSO_CLIENT_ID as string,
        authority: process.env.MICROSOFT_SSO_AUTHORITY as string,
        clientSecret: process.env.MICROSOFT_SSO_CLIENT_SECRET as string,
      },
      system: {
        loggerOptions: {
          loggerCallback: (level, message, containsPii) => {
            if (containsPii) {
              return;
            }
            switch (level) {
              case 1: // Error
                log_error(new Error(message));
                break;
              case 2: // Warning
                console.warn(message);
                break;
              case 3: // Info
                console.info(message);
                break;
              case 4: // Verbose
                console.debug(message);
                break;
            }
          },
          piiLoggingEnabled: false,
          logLevel: process.env.NODE_ENV === "development" ? 4 : 2,
        },
      },
    };

    return new ConfidentialClientApplication(clientConfig);
  }

  public static getAuthCodeUrlParameters() {
    return {
      scopes: ["openid", "profile", "email"],
      redirectUri: process.env.MICROSOFT_SSO_REDIRECT_URI as string,
    };
  }

  public static getTokenRequestParameters(code: string) {
    return {
      code,
      scopes: ["openid", "profile", "email"],
      redirectUri: process.env.MICROSOFT_SSO_REDIRECT_URI as string,
    };
  }
}

export default MSALConfig;