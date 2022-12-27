/* eslint-disable @typescript-eslint/naming-convention */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable, of } from 'rxjs';
import { ZONE_LIST_MOCK } from './zones.service.mock';
import { ZoneListResponse } from '../interfaces/zone-list-response.interface';
import { UnitUpdateParams } from '../interfaces/unit-update-params.interface';
import { ZoneCreateParams } from '../interfaces/zone-create-params.interface';
import { ZoneDeleteParams } from '../interfaces/zone-delete-params.interface';
import { ZoneUpdateParams } from '../interfaces/zone-update-params.interface';

@Injectable()
export class ZonesService {
  constructor(
    private http: HttpClient,
  ) {}

  getZoneList(): Observable<ZoneListResponse[]> {
    return environment.isMock ? of(ZONE_LIST_MOCK()) : this.http.get<ZoneListResponse[]>(`${environment.apiURL}/api/zone/list`);
  }

  createZone(params: ZoneCreateParams): Observable<unknown> {
    return environment.isMock ? of() : this.http.post(`${environment.apiURL}/api/zone/add`, {
      Token: environment.token,
      ...params,
    });
  }

  updateZone(params: ZoneUpdateParams): Observable<unknown> {
    return environment.isMock ? of() : this.http.post(`${environment.apiURL}/api/zone`, {
      Token: environment.token,
      ...params,
    });
  }

  deleteZone(params: ZoneDeleteParams): Observable<unknown> {
    return environment.isMock ? of() : this.http.post(`${environment.apiURL}/api/zone/del`, {
      Token: environment.token,
      ...params,
    });
  }

  updateUnit(params: UnitUpdateParams): Observable<unknown> {
    return environment.isMock ? of() : this.http.post(`${environment.apiURL}/api/unit`, {
      Token: environment.token,
      ...params,
    });
  }
}
