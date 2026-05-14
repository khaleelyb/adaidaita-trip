import Peer from 'simple-peer';
import { io, Socket } from 'socket.io-client';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export class WebRTCService {
  private peer: Peer.Instance | null = null;
  private socket: Socket | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  constructor() {
    // Optionally use socket.io for signaling if needed, 
    // but we can also use Firestore for signaling for better integration in this environment.
    this.socket = io();
  }

  async startCall(userId: string, receiverId: string, stream: MediaStream, onRemoteStream: (stream: MediaStream) => void) {
    this.localStream = stream;
    
    const callDoc = doc(db, 'calls', `${userId}_${receiverId}`);
    
    this.peer = new Peer({
      initiator: true,
      trickle: true,
      stream: stream,
    });

    this.peer.on('signal', async (data) => {
      try {
        await setDoc(callDoc, {
          callerId: userId,
          receiverId: receiverId,
          offer: data,
          status: 'negotiating',
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `calls/${userId}_${receiverId}`);
      }
    });

    this.peer.on('stream', (remoteStream) => {
      this.remoteStream = remoteStream;
      onRemoteStream(remoteStream);
    });

    // Listen for answer
    onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (data?.answer && this.peer) {
        this.peer.signal(data.answer);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `calls/${userId}_${receiverId}`);
    });
  }

  async receiveCall(callId: string, stream: MediaStream, onRemoteStream: (stream: MediaStream) => void) {
    this.localStream = stream;
    const callDoc = doc(db, 'calls', callId);
    
    try {
      const snapshot = await getDoc(callDoc);
      const data = snapshot.data();
      if (!data) return;

      this.peer = new Peer({
        initiator: false,
        trickle: true,
        stream: stream,
      });

      this.peer.on('signal', async (signalData) => {
        try {
          await updateDoc(callDoc, {
            answer: signalData,
            status: 'active',
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `calls/${callId}`);
        }
      });

      this.peer.on('stream', (remoteStream) => {
        this.remoteStream = remoteStream;
        onRemoteStream(remoteStream);
      });

      if (data.offer) {
        this.peer.signal(data.offer);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `calls/${callId}`);
    }
  }

  endCall() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
  }
}

export const webrtcService = new WebRTCService();
