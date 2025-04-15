import axios from 'axios';
import { config } from './config';

export class NZBGetClient {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly auth: string;

  constructor() {
    this.baseUrl = config.nzbget.url;
    this.username = config.nzbget.username;
    this.password = config.nzbget.password;
    this.auth = Buffer.from(`${this.username}:${this.password}`).toString('base64');
  }

  /**
   * Make an API call to NZBGet
   * @param method The RPC method to call
   * @param params Parameters for the method
   * @returns The API response
   */
  private async apiCall<T>(method: string, params: any[] = []): Promise<T> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/jsonrpc`,
        {
          method,
          params,
          id: Date.now(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.auth}`,
          },
        }
      );

      if (response.data.error) {
        throw new Error(`NZBGet API error: ${JSON.stringify(response.data.error)}`);
      }

      return response.data.result as T;
    } catch (error) {
      console.error(`Error calling NZBGet API method ${method}:`, error);
      throw error;
    }
  }

  /**
   * Get the current download rate
   * @returns Current download speed in KB/s
   */
  async getDownloadRate(): Promise<number> {
    try {
      const status = await this.apiCall<any>('status');
      return status.DownloadRate || 0;
    } catch (error) {
      console.error('Error getting download rate:', error);
      return 0;
    }
  }

  /**
   * Set the download speed limit
   * @param speed Speed limit in KB/s (0 = unlimited)
   * @returns True if successful
   */
  async setSpeedLimit(speed: number): Promise<boolean> {
    try {
      await this.apiCall<boolean>('rate', [speed]);
      console.log(`NZBGet download speed set to ${speed === 0 ? 'unlimited' : speed + ' KB/s'}`);
      return true;
    } catch (error) {
      console.error('Error setting speed limit:', error);
      return false;
    }
  }

  /**
   * Get current NZBGet status
   * @returns Status information
   */
  async getStatus(): Promise<any> {
    try {
      return await this.apiCall<any>('status');
    } catch (error) {
      console.error('Error getting NZBGet status:', error);
      throw error;
    }
  }
}