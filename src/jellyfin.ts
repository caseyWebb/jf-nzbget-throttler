import axios from "axios";
import { config } from "./config";

interface JellyfinMediaInfo {
  Name: string;
  Type: string;
  MediaStreams?: {
    Type: string;
    BitRate?: number;
    Width?: number;
    Height?: number;
    Codec?: string;
  }[];
  MediaType?: string;
  Path?: string;
  Size?: number;
  Container?: string;
}

interface JellyfinSession {
  UserName: string;
  DeviceId: string;
  DeviceName: string;
  Client: string;
  NowPlayingItem?: JellyfinMediaInfo;
  PlayState: {
    CanSeek: boolean;
    IsPaused: boolean;
    IsPlaying: boolean;
    PlayMethod?: string;
    // Used for remote playback scenarios
    MediaSourceId?: string;
    BitRate?: number; // Direct stream bitrate if available
  };
}

export class JellyfinClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = config.jellyfin.url;
    this.apiKey = config.jellyfin.apiKey;
  }

  /**
   * Get active sessions from Jellyfin
   * @returns Array of active sessions
   */
  async getActiveSessions(): Promise<JellyfinSession[]> {
    try {
      const response = await axios.get<JellyfinSession[]>(
        `${this.baseUrl}/Sessions`,
        {
          headers: {
            "X-MediaBrowser-Token": this.apiKey,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching Jellyfin sessions:", error);
      return [];
    }
  }

  /**
   * Check if there are any active streams
   * @returns True if active streams are found, false otherwise
   */
  async hasActiveStreams(): Promise<boolean> {
    const streams = await this.getActiveStreamInfo();
    return streams.length > 0;
  }

  /**
   * Get detailed information about active streams
   * @returns Array of active stream information including bitrates
   */
  async getActiveStreamInfo(): Promise<
    Array<{ session: JellyfinSession; estimatedBitrate: number }>
  > {
    const sessions = await this.getActiveSessions();

    // Filter for sessions that are actively playing video or audio
    const activeStreams = sessions.filter(
      (session) =>
        // !session.PlayState?.IsPaused &&
        session.NowPlayingItem !== undefined &&
        (session.NowPlayingItem.Type === "Movie" ||
          session.NowPlayingItem.Type === "Episode" ||
          session.NowPlayingItem.Type === "Audio"),
    );

    // Create detailed stream information with bitrate estimates
    return activeStreams.map((session) => ({
      session,
      estimatedBitrate: this.estimateStreamBitrate(session),
    }));
  }

  /**
   * Estimate the bitrate for a streaming session
   * @param session The Jellyfin session
   * @returns Estimated bitrate in KB/s
   */
  private estimateStreamBitrate(session: JellyfinSession): number {
    // If PlayState has direct bitrate information, use it
    if (session.PlayState?.BitRate) {
      // Convert from bps to KBps (divide by 8000)
      return Math.ceil(session.PlayState.BitRate / 8000);
    }

    // Check media streams for bitrate information
    if (
      session.NowPlayingItem?.MediaStreams &&
      session.NowPlayingItem.MediaStreams.length > 0
    ) {
      // Sum up bitrates from video and audio streams
      let totalBitrate = 0;

      for (const stream of session.NowPlayingItem.MediaStreams) {
        if (stream.BitRate) {
          totalBitrate += stream.BitRate;
        } else if (stream.Type === "Video") {
          // Estimate video bitrate based on resolution if available
          if (stream.Width && stream.Height) {
            // Basic estimation for H.264 content
            // HD (1080p) ~ 8Mbps, 4K ~ 25Mbps
            if (stream.Height >= 2160) {
              totalBitrate += 25000000; // 4K
            } else if (stream.Height >= 1080) {
              totalBitrate += 8000000; // 1080p
            } else if (stream.Height >= 720) {
              totalBitrate += 5000000; // 720p
            } else {
              totalBitrate += 2500000; // SD
            }
          } else {
            // Default to 1080p equivalent if resolution unknown
            totalBitrate += 8000000;
          }
        } else if (stream.Type === "Audio") {
          // Add estimated audio bitrate
          totalBitrate += 192000; // Assume 192kbps audio
        }
      }

      // Convert from bps to KBps (divide by 8000)
      return Math.ceil(totalBitrate / 8000);
    }

    // Default bitrates by content type if we couldn't determine from stream info
    const mediaType = session.NowPlayingItem?.Type;
    if (mediaType === "Movie" || mediaType === "Episode") {
      return 8000; // ~8 MB/s for HD video as a safe default (64 Mbps)
    } else if (mediaType === "Audio") {
      return 320; // ~320 KB/s for high-quality audio
    }

    // Ultimate fallback
    return 10000; // 10 MB/s as a safe default
  }

  /**
   * Get a description of active streams
   * @returns String describing active streams
   */
  async getActiveStreamsDescription(): Promise<string> {
    const activeStreams = await this.getActiveStreamInfo();

    if (activeStreams.length === 0) {
      return "No active streams";
    }

    return activeStreams
      .map(
        ({ session, estimatedBitrate }) =>
          `- ${session.UserName} is playing ${session.NowPlayingItem?.Name} on ${session.DeviceName} (estimated ${estimatedBitrate} KB/s)`,
      )
      .join("\n");
  }
}
