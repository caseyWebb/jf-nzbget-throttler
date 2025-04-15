# Jellyfin NZBGet Throttler

> [!WARNING]
>
> This project was vibe coded with Zed's agentic AI. Use it at your own risk.

A TypeScript application that monitors [Jellyfin][] for active streams and dynamically adjusts [NZBGet][]'s download speed to ensure smooth streaming experience.

## Overview

This utility connects to a Jellyfin server and an NZBGet server to balance bandwidth usage between streaming media and downloading content. It automatically throttles NZBGet's download speed when Jellyfin streams are active, using a smart algorithm to account for:

- Number of active streams
- Estimated bitrate of each stream
- Configurable buffer percentage
- Maximum available bandwidth

## Features

- **Smart throttling**: Adjusts download speeds based on the actual bitrates of active streams
- **Automatic detection**: Monitors Jellyfin in real-time for new streams and ended streams
- **Dynamic adjustment**: Continuously optimizes download speeds as streaming conditions change
- **Configurable**: Easily adjust settings through environment variables
- **Docker support**: Run in a container alongside your media stack

## Installation

### Local Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/jf-nzbget-throttler.git
   cd jf-nzbget-throttler
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file with your configuration
   ```
   # Jellyfin configuration
   JELLYFIN_URL=http://your-jellyfin-server:8096
   JELLYFIN_API_KEY=your_jellyfin_api_key

   # NZBGet configuration
   NZBGET_URL=http://your-nzbget-server:6789
   NZBGET_USERNAME=nzbget
   NZBGET_PASSWORD=tegbzn6789

   # Throttling settings
   DEFAULT_SPEED=0  # 0 means unlimited
   CHECK_INTERVAL=30  # How often to check for streams (in seconds)
   MAX_CONNECTION_SPEED=125000  # Maximum connection speed in KB/s (default: 1Gbps = 125000 KB/s)
   BUFFER_PERCENTAGE=20  # Additional buffer percentage to allocate for streams
   ```

4. Build the application
   ```bash
   npm run build
   ```

5. Start the application
   ```bash
   npm start
   ```

### Docker Installation

Add the following to your `docker-compose.yml` file:

```yaml
services:
  jf-nzbget-throttler:
    image: ghcr.io/caseyWebb/jf-nzbget-throttler:latest
    container_name: jf-nzbget-throttler
    restart: unless-stopped
    environment:
      - JELLYFIN_URL=http://jellyfin:8096
      - JELLYFIN_API_KEY=your_jellyfin_api_key
      - NZBGET_URL=http://nzbget:6789
      - NZBGET_USERNAME=nzbget
      - NZBGET_PASSWORD=tegbzn6789
      - DEFAULT_SPEED=0
      - CHECK_INTERVAL=30
      - MAX_CONNECTION_SPEED=125000
      - BUFFER_PERCENTAGE=20
```

## Configuration

Configuration is managed through environment variables or a `.env` file:

| Variable | Description | Default |
|----------|-------------|--------|
| JELLYFIN_URL | URL of your Jellyfin server | http://localhost:8096 |
| JELLYFIN_API_KEY | API key for Jellyfin access | (required) |
| NZBGET_URL | URL of your NZBGet server | http://localhost:6789 |
| NZBGET_USERNAME | NZBGet username | nzbget |
| NZBGET_PASSWORD | NZBGet password | tegbzn6789 |
| DEFAULT_SPEED | Default download speed when no streams are active (0 = unlimited) | 0 |
| CHECK_INTERVAL | How often to check for streams (in seconds) | 30 |
| MAX_CONNECTION_SPEED | Maximum connection speed in KB/s (1Gbps = 125000 KB/s) | 125000 |
| BUFFER_PERCENTAGE | Additional bandwidth buffer for streams (percentage) | 20 |

## How It Works

1. The application connects to Jellyfin and queries active sessions at the configured interval
2. For each active stream, it estimates the bitrate based on:
   - Direct bitrate information if available
   - Video resolution and codec information
   - Audio quality
3. It calculates the total bandwidth needed for all streams and adds a buffer percentage
4. The remaining bandwidth (max connection speed minus stream requirements) is allocated to NZBGet
5. If there are no active streams, NZBGet is allowed to use the full bandwidth (or configured default)

### Bitrate Estimation

When exact bitrate information isn't available from Jellyfin, the application estimates based on:

- 4K video: ~25 Mbps
- 1080p video: ~8 Mbps
- 720p video: ~5 Mbps
- SD video: ~2.5 Mbps
- Audio: ~192 Kbps

## Troubleshooting

### Common Issues

1. **Cannot connect to Jellyfin**
   - Verify the JELLYFIN_URL is correct
   - Check that your API key is valid
   - Ensure network connectivity between the throttler and Jellyfin

2. **Cannot connect to NZBGet**
   - Verify the NZBGET_URL is correct
   - Check that your username and password are correct
   - Ensure network connectivity between the throttler and NZBGet

3. **NZBGet speed not changing**
   - Check the application logs for error messages
   - Verify that you have permissions to change NZBGet settings
   - Try manually changing the speed in NZBGet to confirm it works

### Debugging

To run the application in development mode with auto-reloading:

```bash
npm run dev
```

## License

WTFPL

## Acknowledgements

- [Jellyfin][] - The Free Software Media System
- [NZBGet][] - The most efficient usenet downloader

[Jellyfin]: https://jellyfin.org/
[NZBGet]: https://nzbget.net/
