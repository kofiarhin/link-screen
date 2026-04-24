import { ICE_SERVERS } from '../constants/constants';

export function createPeerConnection() {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}
