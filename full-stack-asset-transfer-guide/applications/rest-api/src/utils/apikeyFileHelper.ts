/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as path from 'path';

interface AppInfo {
    app_id: string;
    api_key: string;
    share_user: boolean;
    admin_as_default: boolean;
}

  
export class ApiKeyFileHelper {
  protected apps: any;

  constructor(profilePath: string) {
    const configPath = path.resolve(process.cwd(), profilePath);
    this.apps = require(configPath);
  }

  public getAppInfo(apiKey: string): undefined | AppInfo {
    for (const app of this.apps) {
      if (app.api_key === apiKey) {
        return app;
      }
    }
  }
}
