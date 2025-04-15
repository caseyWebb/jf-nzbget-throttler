import schedule from "node-schedule";
import { config } from "./config";
import { JellyfinClient } from "./jellyfin";
import { NZBGetClient } from "./nzbget";

class JellyfinNzbgetThrottler {
  private jellyfinClient: JellyfinClient;
  private nzbgetClient: NZBGetClient;
  private currentSpeedLimit: number = 0;
  private job: schedule.Job | null = null;

  constructor() {
    this.jellyfinClient = new JellyfinClient();
    this.nzbgetClient = new NZBGetClient();
  }

  /**
   * Start the monitoring process
   */
  async start(): Promise<void> {
    console.log("Starting Jellyfin-NZBGet Throttler");
    console.log(`Jellyfin URL: ${config.jellyfin.url}`);
    console.log(`NZBGet URL: ${config.nzbget.url}`);
    console.log(
      `Max connection speed: ${config.throttling.maxConnectionSpeed} KB/s`,
    );
    console.log(`Buffer percentage: ${config.throttling.bufferPercentage}%`);
    console.log(`Check interval: ${config.throttling.checkInterval} seconds`);

    // Schedule the check job
    const cronExpression = `*/${config.throttling.checkInterval} * * * * *`; // Run every X seconds
    this.job = schedule.scheduleJob(cronExpression, async () => {
      await this.checkAndThrottle();
    });

    // Do an initial check
    await this.checkAndThrottle();
  }

  /**
   * Stop the monitoring process
   */
  stop(): void {
    if (this.job) {
      this.job.cancel();
      this.job = null;
    }
    console.log("Monitoring stopped");
  }

  /**
   * Calculate the download speed limit based on active streams
   * @param activeStreams Active stream information
   * @returns The calculated speed limit in KB/s
   */
  private calculateSpeedLimit(
    activeStreams: Array<{ session: any; estimatedBitrate: number }>,
  ): number {
    // If no active streams, use default speed (unlimited or configured value)
    if (activeStreams.length === 0) {
      return config.throttling.maxConnectionSpeed;
    }

    // Calculate total bitrate needed for all active streams
    const totalStreamBitrate = activeStreams.reduce(
      (total, { estimatedBitrate }) => total + estimatedBitrate,
      0,
    );

    // Add buffer percentage
    const bufferMultiplier = 1 + config.throttling.bufferPercentage / 100;
    const totalBitrateWithBuffer = Math.ceil(
      totalStreamBitrate * bufferMultiplier,
    );

    // Calculate remaining bandwidth for NZBGet
    const remainingBandwidth = Math.max(
      0,
      config.throttling.maxConnectionSpeed - totalBitrateWithBuffer,
    );

    return remainingBandwidth;
  }

  /**
   * Check for active streams and throttle NZBGet dynamically
   */
  private async checkAndThrottle(): Promise<void> {
    try {
      // Get active streams with estimated bitrates
      const activeStreams = await this.jellyfinClient.getActiveStreamInfo();

      // Calculate appropriate speed limit based on active streams
      const newSpeedLimit = this.calculateSpeedLimit(activeStreams);

      // Only update speed if it's different from current setting
      if (newSpeedLimit !== this.currentSpeedLimit) {
        await this.nzbgetClient.setSpeedLimit(newSpeedLimit);
        this.currentSpeedLimit = newSpeedLimit;

        if (activeStreams.length > 0) {
          console.log("==================================================");
          console.log(`${activeStreams.length} Active streams detected:`);
          console.log(await this.jellyfinClient.getActiveStreamsDescription());
          console.log(
            `Reducing speed by ${config.throttling.maxConnectionSpeed - newSpeedLimit} KB/s`,
          );
          console.log(`Setting NZBGet speed to ${newSpeedLimit} KB/s`);
        } else {
          console.log(
            `No active streams, setting NZBGet speed to ${newSpeedLimit === 0 ? "unlimited" : newSpeedLimit + " KB/s"}`,
          );
        }
      }
    } catch (error) {
      console.error("Error during check and throttle:", error);
    }
  }
}

// Create and start the throttler
const throttler = new JellyfinNzbgetThrottler();

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down...");
  throttler.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Shutting down...");
  throttler.stop();
  process.exit(0);
});

// Start the throttler
throttler.start().catch((err) => {
  console.error("Failed to start throttler:", err);
  process.exit(1);
});
