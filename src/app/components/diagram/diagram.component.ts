import { AfterViewInit, ChangeDetectorRef, Component, ViewChild, ViewEncapsulation } from '@angular/core';
import * as go from 'gojs';
import { DataSyncService, DiagramComponent, PaletteComponent } from 'gojs-angular';
import produce from 'immer';
import * as utils from 'src/app/utils/diagram-utils';
import { ZoneType } from 'src/app/enums/zone-type.enum';
import { NodeType } from 'src/app/enums/node-type.enum';

@Component({
  selector: 'app-diagram',
  templateUrl: './diagram.component.html',
  styleUrls: ['./diagram.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class AppDiagramComponent implements AfterViewInit {
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

    paletteNodeData: [],
    paletteModelData: { prop: 'val' },
  };

  public diagramDivClassName = 'myDiagramDiv';
  public paletteDivClassName = 'myPaletteDiv';
  public oDivClassName = 'myOverviewDiv';

  public observedDiagram = null;
  public selectedNodeData: go.ObjectData = null;
  public zoneType = ZoneType;
  constructor(private cdr: ChangeDetectorRef) {

    // TODO: load from backend
    this.state.diagramNodeData = [{
      key: NodeType.rootZone,
      text: 'Root Zone',
      isGroup: true,
      type: ZoneType.type0,
    }];
  }

  get saveDisabled(): boolean {
    return !(this.myDiagramComponent.diagram && this.myDiagramComponent.diagram?.isModified);
  }

  get deleteZoneDisabled(): boolean {
    return!(
      this.myDiagramComponent.diagram
        && this.myDiagramComponent.diagram.commandHandler.canDeleteSelection()
        && this.myDiagramComponent.diagram.selection.all(n => n instanceof go.Group)
        && this.myDiagramComponent.diagram.selection.all(n => n.data.key !== NodeType.rootZone)
    );
  }

  get inZoomDisabled(): boolean {
    return!(this.myDiagramComponent.diagram && this.myDiagramComponent.diagram.commandHandler.canIncreaseZoom());
  }

  get outZoomDisabled(): boolean {
    return!(this.myDiagramComponent.diagram && this.myDiagramComponent.diagram.commandHandler.canDecreaseZoom());
  }

  get keyRootZone(): go.Key {
    const rootZone = this.myDiagramComponent.diagram.model.nodeDataArray.find((node) => node.key === NodeType.rootZone);
    const keyRootZone = rootZone ? this.myDiagramComponent.diagram.model.getKeyForNodeData(rootZone) : undefined;

    if (!keyRootZone) {
      console.error(`${NodeType.rootZone} not found`);
    }
    return keyRootZone;
  }

  public initDiagram(): go.Diagram {
    const $ = go.GraphObject.make;
    const dia = $(go.Diagram, {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'undoManager.isEnabled': true,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'commandHandler.doKeyDown': () => {},
      layout: new go.GridLayout({
        wrappingWidth: Infinity,
        alignment: go.GridLayout.Position,
        cellSize: new go.Size(1, 1),
      }),
      mouseDrop: (e: go.InputEvent) => utils.finishDrop(e, null),
      model: $(go.GraphLinksModel, {
        nodeKeyProperty: 'id',
        linkToPortIdProperty: 'toPort',
        linkFromPortIdProperty: 'fromPort',
        linkKeyProperty: 'key',
      }),
    });

    dia.groupTemplate = new go.Group('Auto', {
      ungroupable: true,
      mouseDragEnter: (e, grp, prev) => utils.highlightGroup(e, grp, true),
      mouseDragLeave: (e, grp, next) => utils.highlightGroup(e, grp, false),
      mouseDrop: utils.finishDrop,
      memberAdded: utils.updateGroupCount,
      memberRemoved: utils.updateGroupCount,
      subGraphExpandedChanged: utils.groupExpandedChanged,
      doubleClick: (e, grp) => utils.groupClick(grp as go.Group),
      computesBoundsAfterDrag: true,
      handlesDragDropForMembers: true,
      layout: new go.GridLayout({
        wrappingColumn: 3,
        alignment: go.GridLayout.Position,
        cellSize: new go.Size(1, 1),
        spacing: new go.Size(5, 5),
      }),
      selectionAdornmentTemplate:
        $(go.Adornment, 'Auto',
          $(go.Shape, { fill: null, stroke: utils.selectStroke(NodeType.zone), strokeWidth: 4 }),
          $(go.Placeholder),
        ),
    }).bind(new go.Binding('background', 'isHighlighted', (h) => h ? 'rgba(255,0,0,0.2)' : 'transparent').ofObject());

    dia.groupTemplate.add(
      new go.Shape('Rectangle', {
        name: 'zone_panel',
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
        minSize: new go.Size(70, 0),
      })
        .bind('background', 'type', utils.zoneFill)
        .add($('SubGraphExpanderButton', {
          name: 'expander_button',
          alignment: go.Spot.Left,
          margin: 5,
        }))
        .add(new go.TextBlock({
          name: 'zone_name',
          maxLines: 1,
          alignment: go.Spot.Right,
          editable: true,
          margin: 5,
          font: 'bold 16px sans-serif',
          opacity: 0.95,
          stroke: '#404040',
        }).bind('text', 'text', null, null))
      )
      .add(new go.Panel('Auto', { name: 'hidden_panel', visible: false }).add(
        $(go.Picture, {
          desiredSize: new go.Size(68, 68),
          imageStretch: go.GraphObject.Uniform,
          source: 'assets/cloud-black.png',
          background: null,
        }),
        $(go.TextBlock, {
          name: 'nodes_counter',
          text: '0',
          textAlign: 'center',
          verticalAlignment: go.Spot.Center,
          font: 'bold 15px sans-serif',
        }),
      ))
      .add(new go.Placeholder({ padding: 10, alignment: go.Spot.TopLeft }))
    );

    dia.nodeTemplate = $(go.Node, 'Auto', {
      selectionAdornmentTemplate:
        $(go.Adornment, 'Auto',
          $(go.Shape, { fill: null, stroke: utils.selectStroke(NodeType.device), strokeWidth: 3 }),
          $(go.Placeholder),
        ),
    });

    dia.nodeTemplate.add(new go.Shape('Rectangle', {
      stroke: utils.zoneStroke(null),
      fill: utils.zoneFill(null),
      strokeWidth: 2,
    })
      .bind('fill', 'type', utils.zoneFill)
      .bind('stroke', 'type', utils.zoneStroke),
    );

    dia.nodeTemplate.add(new go.Panel('Vertical').add(
      new go.TextBlock({
        maxLines: 1,
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
    ));

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

  public initOverview(): go.Overview {
    const $ = go.GraphObject.make;
    const overview = $(go.Overview);
    return overview;
  }

  public ngAfterViewInit() {
    if (this.observedDiagram) {return;}
    this.observedDiagram = this.myDiagramComponent.diagram;
    this.cdr.detectChanges();
    const appComp: AppDiagramComponent = this;

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

  public save(): void {
    localStorage.setItem('nodeDataArray', JSON.stringify(this.myDiagramComponent.diagram.model.nodeDataArray));
    this.myDiagramComponent.diagram.isModified = false;
  }

  public load(): void {
    if (localStorage.getItem('nodeDataArray')) {
      this.myDiagramComponent.diagram.model.nodeDataArray = JSON.parse(localStorage.getItem('nodeDataArray'));
    }
  }

  public addZone(): void {
    this.myDiagramComponent.diagram.model.addNodeData({
      key: NodeType.zone,
      text: 'Zone',
      isGroup: true,
      type: ZoneType.type0,
    });
  }

  public addDevice(type?: ZoneType): void {
    if (this.keyRootZone) {
      this.myDiagramComponent.diagram.model.addNodeData({
        key: NodeType.device,
        text: 'Device',
        group: this.keyRootZone,
        type: type || ZoneType.type0,
      });
    }
  }

  public deleteZone(): void {
    if (this.keyRootZone) {
      const deleteIds = [];
      this.myDiagramComponent.diagram.selection.each(n => deleteIds.push(n.data.id));
      this.myDiagramComponent.diagram.model.nodeDataArray
        .filter((node) => deleteIds.includes(node.group))
        .forEach((node) => node.group = this.keyRootZone);
      this.myDiagramComponent.diagram.updateAllRelationshipsFromData();
      this.myDiagramComponent.diagram.commandHandler.deleteSelection();
    }
  }

  public outZoom(): void {
    if (this.myDiagramComponent.diagram.commandHandler.canDecreaseZoom()) {
      this.myDiagramComponent.diagram.commandHandler.decreaseZoom();
    }
  }

  public inZoom(): void {
    if (this.myDiagramComponent.diagram.commandHandler.canIncreaseZoom()) {
      this.myDiagramComponent.diagram.commandHandler.increaseZoom();
    }
  }
}
