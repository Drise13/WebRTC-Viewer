# Multi-Stream WebRTC Viewer

## Overview

This project demonstrates an implementation of a multi-stream WebRTC viewer using Amazon Kinesis Video Streams. It allows dynamic creation and management of multiple WebRTC stream viewers, each capable of independently establishing and controlling a WebRTC connection and data channel.

## Features

- **Dynamic Viewer Creation**: Create multiple viewer instances on-the-fly, each with its own WebRTC connection.
- **Custom Channel Naming**: Utilize a flexible channel naming system allowing user-defined patterns.
- **Independent Stream Control**: Each stream viewer operates independently, with individual control over start, stop, and message handling functionalities.
- **Real-Time Messaging**: Integrated data channels for real-time message exchange between viewers and the stream source.

## Setup

### Prerequisites

- Amazon Kinesis Video Streams setup
- A modern web browser supporting WebRTC

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-repository/multi-stream-webrtc-viewer.git
   ```

3. Configure your AWS credentials and other necessary settings in a configuration file or environment variables.

### Running the Application

1. Open `index.html` in your web browser to access the application.

## Usage

1. **Create Viewer**: Input the desired channel name pattern and any AWS credentials
2. **Control Stream**: Use the controls in each viewer instance to start or stop the stream, and to send or receive messages.
3. **Monitor Streams**: Observe the real-time metrics and messages for each active stream.

## Contributing

Contributions to this project are welcome! Please fork the repository and submit a pull request with your proposed changes.

## License

This project is licensed under Apache 2.0 based on [the source example project](https://github.com/awslabs/amazon-kinesis-video-streams-webrtc-sdk-js). See the LICENSE file for more details.
