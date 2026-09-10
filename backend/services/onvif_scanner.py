import socket
import time
import re
from typing import List, Dict, Any

WS_DISCOVERY_PAYLOAD = """<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
            xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
            xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
            xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <e:Header>
    <w:MessageID>uuid:a123b456-c789-0000-0000-000000000000</w:MessageID>
    <w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
    <w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
  </e:Header>
  <e:Body>
    <d:Probe>
      <d:Types>dn:NetworkVideoTransmitter</d:Types>
    </d:Probe>
  </e:Body>
</e:Envelope>"""

class ONVIFNetworkScanner:
    def scan_network(self, timeout: float = 2.0) -> List[Dict[str, Any]]:
        """
        Sends UDP WS-Discovery Probe to 239.255.255.250:3702 to discover real ONVIF cameras on LAN.
        """
        discovered_cameras = []
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.settimeout(timeout)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)

        try:
            sock.sendto(WS_DISCOVERY_PAYLOAD.encode('utf-8'), ('239.255.255.250', 3702))
            start_time = time.time()
            seen_ips = set()

            while time.time() - start_time < timeout:
                try:
                    data, addr = sock.recvfrom(4096)
                    ip = addr[0]
                    if ip not in seen_ips:
                        seen_ips.add(ip)
                        resp_str = data.decode('utf-8', errors='ignore')
                        
                        # Extract hardware model if present
                        model_match = re.search(r'hardware/([^ \t\r\n<]+)', resp_str, re.IGNORECASE)
                        model_name = model_match.group(1) if model_match else "ONVIF IP Camera"

                        discovered_cameras.append({
                            "ip": ip,
                            "port": 554,
                            "onvif_port": 80,
                            "model": model_name,
                            "rtsp_url_template": f"rtsp://admin:password@{ip}:554/Streaming/channels/101",
                            "status": "DISCOVERED"
                        })
                except socket.timeout:
                    break
                except Exception:
                    break
        except Exception as e:
            print(f"[ONVIF Scanner Warning]: {e}")
        finally:
            sock.close()

        return discovered_cameras

onvif_scanner = ONVIFNetworkScanner()
