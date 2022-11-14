import { AfterViewInit, ChangeDetectorRef, Component, ViewChild, ViewEncapsulation } from '@angular/core';
import * as go from 'gojs';
import { DataSyncService, DiagramComponent, PaletteComponent } from 'gojs-angular';
import produce from 'immer';
import * as utils from './utils/diagram-utils';
import { ZoneType } from './enums/zone-type.enum';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class AppComponent implements AfterViewInit {
  @ViewChild('myDiagram', { static: true })
  public myDiagramComponent: DiagramComponent;
  @ViewChild('myPalette', { static: true })
  public myPaletteComponent: PaletteComponent;

  public state = {
    diagramNodeData: [],
    diagramLinkData: [],
    diagramModelData: { prop: 'value' },
    skipsDiagramUpdate: false,
    selectedNodeData: null, // used by InspectorComponent

    paletteNodeData: [
      { key: 'area1', text: 'Area1', isGroup: true, type: ZoneType.type1 },
      { key: 'area2', text: 'Area2', isGroup: true, type: ZoneType.type2 },
      { key: 'area3', text: 'Area3', isGroup: true, type: ZoneType.type3 },
      { key: 'area4', text: 'Area4', isGroup: true, type: ZoneType.type4 },
      { key: 'node', text: 'Device' },
    ],
    paletteModelData: { prop: 'val' },
  };

  public diagramDivClassName = 'myDiagramDiv';
  public paletteDivClassName = 'myPaletteDiv';
  public oDivClassName = 'myOverviewDiv';

  public observedDiagram = null;
  public selectedNodeData: go.ObjectData = null;

  constructor(private cdr: ChangeDetectorRef) {}

  public initDiagram(): go.Diagram {
    const $ = go.GraphObject.make;
    const dia = $(go.Diagram, {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'undoManager.isEnabled': true,
      layout: new go.GridLayout({
        wrappingWidth: Infinity,
        alignment: go.GridLayout.Position,
        cellSize: new go.Size(1, 1),
      }),
      mouseDrop: (e: any) => utils.finishDrop(e, null),
      model: $(go.GraphLinksModel, {
        nodeKeyProperty: 'id',
        linkToPortIdProperty: 'toPort',
        linkFromPortIdProperty: 'fromPort',
        linkKeyProperty: 'key',
      }),
    });

    dia.groupTemplate = new go.Group('Auto', {
      background: 'blue',
      ungroupable: true,
      mouseDragEnter: (e, grp, prev) => utils.highlightGroup(e, grp, true),
      mouseDragLeave: (e, grp, next) => utils.highlightGroup(e, grp, false),
      mouseDrop: utils.finishDrop,
      computesBoundsAfterDrag: true,
      handlesDragDropForMembers: true,
      layout: new go.GridLayout({
        wrappingColumn: 3,
        alignment: go.GridLayout.Position,
        cellSize: new go.Size(1, 1),
        spacing: new go.Size(1, 1),
      }),
    }).bind(new go.Binding('background', 'isHighlighted', (h) => h ? 'rgba(255,0,0,0.2)' : 'transparent').ofObject());

    dia.groupTemplate.add(
      new go.Shape('Rectangle', {
        strokeWidth: 3,
        stroke: utils.zoneStroke(null),
        fill: utils.zoneFill(null),
      })
        .bind('fill', 'type', utils.zoneFill)
        .bind('stroke', 'type', utils.zoneStroke),
    );

    dia.groupTemplate.add(new go.Panel('Vertical')
      .add(new go.Panel('Horizontal',{
        stretch: go.GraphObject.Horizontal,
        background: utils.zoneFill(null),
      })
        .bind('background', 'type', utils.zoneFill)
        .add(go.GraphObject.make('SubGraphExpanderButton', {
          alignment: go.Spot.Right,
          margin: 5,
        }))
        .add(new go.TextBlock({
          alignment: go.Spot.Left,
          editable: true,
          margin: 5,
          font: 'bold 16px sans-serif',
          opacity: 0.95,
          stroke: '#404040',
        }).bind('text', 'text', null, null))
      )
      .add(new go.Placeholder({ padding: 10, alignment: go.Spot.TopLeft }))
    );

    dia.nodeTemplate = $(go.Node, 'Vertical');

    dia.nodeTemplate.add(
      new go.TextBlock({
        alignment: go.Spot.Center,
        editable: true,
        margin: 8,
        font: 'bold 13px sans-serif',
      }).bind('text', 'text', null, null),
      $(go.Picture, {
        desiredSize: new go.Size(48, 48),
        imageStretch: go.GraphObject.Uniform,
        source: 'assets/device.png',
        background: null,
      }),
    );

    return dia;
  }

  public diagramModelChange = function(changes: go.IncrementalData) {
    if (!changes) {return;}
    const appComp = this;
    this.state = produce(this.state, (draft: {
        skipsDiagramUpdate: boolean;
        diagramNodeData: go.ObjectData[];
        diagramLinkData: go.ObjectData[];
        diagramModelData: go.ObjectData;
        selectedNodeData: go.ObjectData;
      }) => {
      draft.skipsDiagramUpdate = true;
      draft.diagramNodeData = DataSyncService.syncNodeData(
        changes,
        draft.diagramNodeData,
        appComp.observedDiagram.model
      );
      draft.diagramLinkData = DataSyncService.syncLinkData(
        changes,
        draft.diagramLinkData,
        appComp.observedDiagram.model
      );
      draft.diagramModelData = DataSyncService.syncModelData(
        changes,
        draft.diagramModelData
      );

      const modifiedNodeDatas = changes.modifiedNodeData;
      if (modifiedNodeDatas && draft.selectedNodeData) {
        for (const mn of modifiedNodeDatas) {
          const nodeKeyProperty = appComp.myDiagramComponent.diagram.model.nodeKeyProperty as string;
          if (mn[nodeKeyProperty] === draft.selectedNodeData[nodeKeyProperty]) {
            draft.selectedNodeData = mn;
          }
        }
      }
    });
  };

  public initPalette(): go.Palette {
    const $ = go.GraphObject.make;
    const palette = $(go.Palette, {
      layout: new go.GridLayout({
        wrappingColumn: 1,
        alignment: go.GridLayout.Position,
        cellSize: new go.Size(1, 1),
      }),
    });

    palette.groupTemplate = $(go.Group, 'Auto');

    palette.groupTemplate.add(
      new go.Shape('Rectangle', {
        desiredSize: new go.Size(150, 100),
        strokeWidth: 3,
        stroke: utils.zoneStroke(null),
        fill: utils.zoneFill(null),
      })
        .bind('fill', 'type', utils.zoneFill)
        .bind('stroke', 'type', utils.zoneStroke),
    );

    palette.groupTemplate.add(
      new go.Panel('Horizontal', {
        stretch: go.GraphObject.Horizontal,
        desiredSize: new go.Size(150, 35),
        background: utils.zoneFill(null),
        alignment: go.Spot.Top,
      })
        .bind('background', 'type', utils.zoneFill)
        .add(go.GraphObject.make('SubGraphExpanderButton', {
          alignment: go.Spot.Right,
          margin: 5,
        }))
        .add(new go.TextBlock({
          alignment: go.Spot.Left,
          editable: false,
          margin: 5,
          font: 'bold 16px sans-serif',
          opacity: 0.95,
          stroke: '#404040',
        }).bind('text', 'text', null, null))
    );

    palette.nodeTemplate = $(go.Node, 'Vertical');

    palette.nodeTemplate.add(
      new go.TextBlock({
        alignment: go.Spot.Center,
        editable: false,
        font: 'bold 13px sans-serif',
      }).bind('text', 'text', null, null),
      $(go.Picture, {
        desiredSize: new go.Size(48, 48),
        imageStretch: go.GraphObject.Uniform,
        source: 'assets/device.png',
        background: null,
      }),
    );

    palette.model = $(go.GraphLinksModel);
    return palette;
  }

  public initOverview(): go.Overview {
    const $ = go.GraphObject.make;
    const overview = $(go.Overview);
    return overview;
  }

  public ngAfterViewInit() {
    if (this.observedDiagram) {return;}
    this.observedDiagram = this.myDiagramComponent.diagram;
    this.cdr.detectChanges();
    const appComp: AppComponent = this;

    this.myDiagramComponent.diagram.addDiagramListener('ChangedSelection', (e) => {
      if (e.diagram.selection.count === 0) {
        appComp.selectedNodeData = null;
      }
      const node = e.diagram.selection.first();
      appComp.state = produce(appComp.state, (draft) => {
        if (node instanceof go.Node) {
          const idx = draft.diagramNodeData.findIndex((nd) => nd.id === node.data.id);
          draft.selectedNodeData = draft.diagramNodeData[idx];
        } else {
          draft.selectedNodeData = null;
        }
      });
    });
  }

  public handleInspectorChange(changedPropAndVal: { prop: any; newVal: any }) {
    const path = changedPropAndVal.prop;
    const value = changedPropAndVal.newVal;

    this.state = produce(this.state, (draft) => {
      const data = draft.selectedNodeData;
      data[path] = value;
      const key = data.id;
      const idx = draft.diagramNodeData.findIndex((nd) => nd.id === key);
      if (idx >= 0) {
        draft.diagramNodeData[idx] = data;
        draft.skipsDiagramUpdate = false;
      }
    });
  }
}
