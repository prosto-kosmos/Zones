import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, of } from 'rxjs';
import { ZoneListResponse } from '../interfaces/zone-response.interface';
import { ZONE_LIST_MOCK } from './zones.service.mock';

@Injectable()
export class ZonesService {
  constructor(
    private http: HttpClient,
  ) {}

  getZoneList(): Observable<ZoneListResponse[]> {
    return environment.isMock ? of(ZONE_LIST_MOCK()) : this.http.get<ZoneListResponse[]>(`${environment.apiURL}/api/zone/list`);
  }
}
