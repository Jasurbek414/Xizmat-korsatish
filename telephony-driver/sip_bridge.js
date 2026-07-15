/**
 * Telephony Driver: Universal SIP-to-WebSocket Proxy Bridge
 * 
 * This background proxy runs on the operator's PC. It accepts standard
 * WebSocket text connections from the browser's JsSIP engine, translates
 * the WebSocket headers (Via/Contact transport) to standard UDP SIP format,
 * and forwards them to the Uztelecom SIP Server.
 */

const WebSocket = require('ws');
const dgram = require('dgram');

const WS_PORT = process.env.WS_PORT || 8089;
const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`==================================================`);
console.log(`ServiceCore Universal SIP-to-WebSocket Proxy active.`);
console.log(`Listening on: ws://127.0.0.1:${WS_PORT}`);
console.log(`==================================================`);

wss.on('connection', (ws) => {
  console.log('[WS] Browser client connected.');

  // Create a dedicated UDP socket for this client session
  const udpSocket = dgram.createSocket('udp4');
  let sipServerIp = '84.54.75.26'; // Default IP
  let sipServerPort = 5060;

  // Listen for responses from Uztelecom SIP Server via UDP and forward them to the browser
  udpSocket.on('message', (msg, rinfo) => {
    let rawSip = msg.toString();
    console.log(`[UDP -> WS] Received response (${msg.length} bytes) from ${rinfo.address}:${rinfo.port}`);
    
    // Translate response back to WS for JsSIP browser client compatibility
    rawSip = rawSip.replace(/Via: SIP\/2\.0\/UDP/gi, 'Via: SIP/2.0/WS');
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(rawSip);
    }
  });

  udpSocket.on('error', (err) => {
    console.error('[UDP] Socket error:', err);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'BRIDGE_ERROR', error: err.message }));
    }
  });

  // Bind to any ephemeral port
  udpSocket.bind(0, () => {
    const localAddr = udpSocket.address();
    console.log(`[UDP] Session bound to local port: ${localAddr.port}`);
  });

  // Listen for packets from the browser
  ws.on('message', (message) => {
    let messageStr = message.toString();

    // Check if it is a JSON settings packet from UI
    if (messageStr.startsWith('{')) {
      try {
        const parsed = JSON.parse(messageStr);
        if (parsed.action === 'REGISTER_SIP') {
          sipServerIp = parsed.data.server_ip || '84.54.75.26';
          sipServerPort = parseInt(parsed.data.local_port) || 5060;
          console.log(`[CONFIG] SIP destination updated to: ${sipServerIp}:${sipServerPort}`);
          // Send initial CALL_STATE back to confirm UI connection
          ws.send(JSON.stringify({ action: 'CALL_STATE', state: 'DISCONNECTED' }));
          return;
        }
      } catch (e) {
        // Fall through if not valid JSON
      }
    }

    // --- SIP HEADER TRANSLATION (ALG) ---
    try {
      const localAddr = udpSocket.address();
      const localPort = localAddr.port;

      // 1. Rewrite Via: Replace WS/WSS transport with UDP transport
      messageStr = messageStr.replace(/Via: SIP\/2\.0\/WSS?/gi, 'Via: SIP/2.0/UDP');
      
      // 2. Rewrite Contact / Via transport parameter
      messageStr = messageStr.replace(/transport=wss?/gi, 'transport=udp');
      
      // 3. Replace invalid browser-generated domain names (e.g., .invalid) with local loopback IP and port
      messageStr = messageStr.replace(/[a-zA-Z0-9.-]+\.invalid/g, `127.0.0.1:${localPort}`);
    } catch (e) {
      console.error('[ALG] Error translating headers:', e);
    }

    // Forward translated SIP string packet directly to Uztelecom SIP Server IP
    console.log(`[WS -> UDP] Forwarding translated request (${messageStr.length} bytes) to ${sipServerIp}:${sipServerPort}`);
    const buffer = Buffer.from(messageStr);
    udpSocket.send(buffer, 0, buffer.length, sipServerPort, sipServerIp, (err) => {
      if (err) {
        console.error('[UDP] Send error to SIP server:', err);
      }
    });
  });

  ws.on('close', () => {
    console.log('[WS] Browser client disconnected. Closing session UDP socket.');
    udpSocket.close();
  });
});
