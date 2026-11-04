import net from 'node:net';

/**
 * Perform a SOCKS5 handshake (RFC 1928 + RFC 1929 username/password auth) over a TCP socket.
 */
export function establishSocks5Tunnel(proxyProfile, targetHost, targetPort, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const useAuth = Boolean(proxyProfile.auth?.enabled && proxyProfile.auth?.username);
    const username = proxyProfile.auth?.username ?? '';
    const password = proxyProfile.auth?.password ?? '';

    const socket = net.createConnection({
      host: proxyProfile.host,
      port: Number(proxyProfile.port)
    });

    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    const timer = setTimeout(() => {
      fail(new Error(`SOCKS5 connection to ${proxyProfile.host}:${proxyProfile.port} timed out (${timeoutMs}ms)`));
    }, timeoutMs);

    let buffer = Buffer.alloc(0);
    let stage = 'greeting';

    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (true) {
        if (stage === 'greeting') {
          if (buffer.length < 2) return;
          const ver = buffer[0];
          const method = buffer[1];
          buffer = buffer.subarray(2);

          if (ver !== 0x05) {
            fail(new Error(`Invalid SOCKS version from proxy: ${ver}`));
            return;
          }
          if (method === 0xff) {
            fail(new Error('Proxy Authentication Required (407): SOCKS5 proxy rejected authentication methods'));
            return;
          }
          if (method === 0x02) {
            const uBytes = Buffer.from(username, 'utf8');
            const pBytes = Buffer.from(password, 'utf8');
            const authPacket = Buffer.concat([
              Buffer.from([0x01, uBytes.length]),
              uBytes,
              Buffer.from([pBytes.length]),
              pBytes
            ]);
            stage = 'auth';
            socket.write(authPacket);
            continue;
          }
          if (method === 0x00) {
            stage = 'connect';
            socket.write(buildSocks5ConnectPacket(targetHost, targetPort));
            continue;
          }
          fail(new Error(`Unsupported SOCKS5 auth method: ${method}`));
          return;
        }

        if (stage === 'auth') {
          if (buffer.length < 2) return;
          const status = buffer[1];
          buffer = buffer.subarray(2);
          if (status !== 0x00) {
            fail(new Error('Proxy Authentication Required (407): check username and password'));
            return;
          }
          stage = 'connect';
          socket.write(buildSocks5ConnectPacket(targetHost, targetPort));
          continue;
        }

        if (stage === 'connect') {
          if (buffer.length < 4) return;
          const ver = buffer[0];
          const rep = buffer[1];
          const atyp = buffer[3];
          if (ver !== 0x05) {
            fail(new Error(`Invalid SOCKS5 connect response version: ${ver}`));
            return;
          }
          if (rep !== 0x00) {
            fail(new Error(`SOCKS5 CONNECT failed with reply code 0x${rep.toString(16)}`));
            return;
          }

          let totalLen = 0;
          if (atyp === 0x01) {
            totalLen = 4 + 4 + 2;
          } else if (atyp === 0x03) {
            if (buffer.length < 5) return;
            totalLen = 4 + 1 + buffer[4] + 2;
          } else if (atyp === 0x04) {
            totalLen = 4 + 16 + 2;
          } else {
            fail(new Error(`Unsupported SOCKS5 address type: ${atyp}`));
            return;
          }

          if (buffer.length < totalLen) return;
          const leftover = buffer.subarray(totalLen);
          socket.pause();
          socket.removeListener('data', onData);
          socket.removeListener('error', onError);
          clearTimeout(timer);
          settled = true;
          if (leftover.length > 0) {
            socket.unshift(leftover);
          }
          resolve(socket);
          return;
        }
      }
    };

    const onError = (err) => fail(err);

    socket.on('error', onError);
    socket.on('data', onData);
    socket.once('connect', () => {
      const greeting = useAuth
        ? Buffer.from([0x05, 0x02, 0x00, 0x02])
        : Buffer.from([0x05, 0x01, 0x00]);
      socket.write(greeting);
    });
  });
}

function parseIpv6Bytes(ipv6) {
  const clean = ipv6.replace(/^\[|\]$/g, '');
  const parts = clean.split('::');
  if (parts.length > 2) return null;
  const left = parts[0] ? parts[0].split(':') : [];
  const right = parts.length === 2 && parts[1] ? parts[1].split(':') : [];
  const missing = 8 - (left.length + right.length);
  if (missing < 0) return null;
  const groups = [
    ...left,
    ...(parts.length === 2 ? Array(missing).fill('0') : []),
    ...right
  ];
  if (groups.length !== 8) return null;
  const buf = Buffer.alloc(16);
  for (let i = 0; i < 8; i++) {
    const val = parseInt(groups[i] || '0', 16);
    if (Number.isNaN(val) || val < 0 || val > 0xffff) return null;
    buf.writeUInt16BE(val, i * 2);
  }
  return buf;
}

function buildSocks5ConnectPacket(host, port) {
  const portBuf = Buffer.alloc(2);
  portBuf.writeUInt16BE(Number(port), 0);
  const cleanHost = host.replace(/^\[|\]$/g, '');

  if (net.isIPv4(cleanHost)) {
    const ipBytes = cleanHost.split('.').map((octet) => Number(octet) & 0xff);
    return Buffer.concat([
      Buffer.from([0x05, 0x01, 0x00, 0x01, ...ipBytes]),
      portBuf
    ]);
  }

  if (net.isIPv6(cleanHost)) {
    const ipv6Buf = parseIpv6Bytes(cleanHost);
    if (ipv6Buf) {
      return Buffer.concat([
        Buffer.from([0x05, 0x01, 0x00, 0x04]),
        ipv6Buf,
        portBuf
      ]);
    }
  }

  const hostBuf = Buffer.from(cleanHost, 'utf8');
  return Buffer.concat([
    Buffer.from([0x05, 0x01, 0x00, 0x03, hostBuf.length]),
    hostBuf,
    portBuf
  ]);
}
