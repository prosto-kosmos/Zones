/* eslint-disable @typescript-eslint/naming-convention */

export interface ZoneListResponse {
  ID: number;
  Name: string;
  Description: string;
  Units: ZoneUnitResponse[] | null;
  MaxSeverity: number;
  MaxUnAckSeverity: number;
  Position: ZonePositionResponse;
}

export interface ZoneUnitResponse {
  Index: number;
  Online: boolean;
  Info: {
    Address: string;
    Name: string;
    Description: string;
    Device: {
      HWPlatform: string;
      SWVersion: string;
      Serial: string;
      MacAddr: string;
    };
    Timestamp: string;
  };
  State: {
    CpuUsage: number;
    Rx: {
      Bytes: number;
      Packets: number;
      BitRate: number;
      PktRate: number;
      DroppedPkts: number;
    };
    Tx: {
      Bytes: number;
      Packets: number;
      BitRate: number;
      PktRate: number;
      DroppedPkts: number;
    };
  };
  MaxSeverity: number;
  MaxUnAckSeverity: number;
  Position: ZonePositionResponse;
}

export interface ZonePositionResponse {
  Left: number;
  Top: number;
  Width: number;
  Height: number;
}
