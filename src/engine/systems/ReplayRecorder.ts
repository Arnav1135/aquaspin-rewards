// src/engine/systems/ReplayRecorder.ts

export interface ReplayFrame {
  timestamp: number;
  action: string;
  data?: any;
}

export class ReplayRecorder {
  private recording: boolean = false;
  private startTime: number = 0;
  private frames: ReplayFrame[] = [];

  public startRecording() {
    this.recording = true;
    this.startTime = Date.now();
    this.frames = [];
  }

  public recordAction(action: string, data?: any) {
    if (!this.recording) return;
    this.frames.push({
      timestamp: Date.now() - this.startTime,
      action,
      data,
    });
  }

  public stopRecording(): ReplayFrame[] {
    this.recording = false;
    return [...this.frames];
  }

  public getRecordedFrames(): ReplayFrame[] {
    return this.frames;
  }
}
