import { AfterViewInit, ChangeDetectorRef, Component, ViewChild, ViewEncapsulation } from '@angular/core';
import * as go from 'gojs';
import { DiagramComponent } from 'gojs-angular';
import * as utils from 'src/app/utils/diagram-utils';
import { ZoneType } from 'src/app/enums/zone-type.enum';
import { NodeType } from 'src/app/enums/node-type.enum';
import { ZonesService } from 'src/app/services/zones.service';
import { DiagramTemplateName } from 'src/app/enums/diagram-template-name.enum';

@Component({
  selector: 'app-diagram',
  templateUrl: './diagram.component.html',
  styleUrls: ['./diagram.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class AppDiagramComponent implements AfterViewInit {
  @ViewChild('myDiagram', { static: true }) public myDiagramComponent: DiagramComponent;

  public state = {
    diagramNodeData: [],
    diagramLinkData: [],
    diagramModelData: { prop: 'value' },
    skipsDiagramUpdate: false,
  };

  public diagramDivClassName = 'myDiagramDiv';
  public overviewDivClassName = 'myOverviewDiv';

  public observedDiagram = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private zonesService: ZonesService,
  ) { }

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
      layout: $(go.GridLayout, {
        wrappingWidth: Infinity,
        alignment: go.GridLayout.Position,
        cellSize: new go.Size(1, 1),
      }),
      mouseDrop: utils.finishDrop,
      model: $(go.GraphLinksModel, {
        nodeKeyProperty: 'id',
        linkToPortIdProperty: 'toPort',
        linkFromPortIdProperty: 'fromPort',
        linkKeyProperty: 'key',
      }),
    });

    dia.groupTemplate = $(go.Group, go.Group.Auto, {
      ungroupable: true,
      mouseDragEnter: (e, grp, prev) => utils.highlightGroup(e, grp, true),
      mouseDragLeave: (e, grp, next) => utils.highlightGroup(e, grp, false),
      memberAdded: utils.updateGroupCount,
      memberRemoved: utils.updateGroupCount,
      subGraphExpandedChanged: utils.groupExpandedChanged,
      doubleClick: (e, grp) => utils.groupClick(grp as go.Group),
      computesBoundsAfterDrag: true,
      handlesDragDropForMembers: true,
      layout: $(go.GridLayout, {
        wrappingColumn: 3,
        alignment: go.GridLayout.Position,
        cellSize: new go.Size(1, 1),
        spacing: new go.Size(5, 5),
      }),
      selectionAdornmentTemplate: $(go.Adornment, go.Adornment.Auto,
        $(go.Shape, {
          fill: null,
          stroke: utils.selectStroke(NodeType.zone),
          strokeWidth: 4,
        }),
        $(go.Placeholder),
      ),
    }).bind(new go.Binding('background', 'isHighlighted', (h) => h ? 'rgba(255,0,0,0.2)' : 'transparent').ofObject());

    dia.groupTemplate.add(
      $(go.Shape, go.Geometry.Rectangle, {
        name: DiagramTemplateName.zonePanel,
        strokeWidth: 3,
        stroke: utils.zoneStroke(null),
        fill: utils.zoneFill(null),
      })
        .bind('fill', 'type', utils.zoneFill)
        .bind('stroke', 'type', utils.zoneStroke),
    );

    dia.groupTemplate.add($(go.Panel, go.Panel.Vertical)
      .add($(go.Panel, go.Panel.Horizontal, {
        stretch: go.GraphObject.Horizontal,
        background: utils.zoneFill(null),
        minSize: new go.Size(70, 0),
      })
        .bind('background', 'type', utils.zoneFill)
        .add($('SubGraphExpanderButton', {
          name: DiagramTemplateName.expanderButton,
          alignment: go.Spot.Left,
          margin: 5,
        }))
        .add($(go.TextBlock, {
          name: DiagramTemplateName.zoneTitle,
          maxLines: 1,
          alignment: go.Spot.Right,
          editable: true,
          margin: 5,
          font: 'bold 16px sans-serif',
          opacity: 0.95,
          stroke: '#404040',
        }).bind('text', 'text', null, null))
      )
      .add($(go.Panel, go.Panel.Auto, { name: DiagramTemplateName.hiddenPanel, visible: false }).add(
        $(go.Picture, {
          desiredSize: new go.Size(68, 68),
          imageStretch: go.GraphObject.Uniform,
          source: 'assets/cloud-black.png',
          background: null,
        }),
        $(go.TextBlock, {
          name: DiagramTemplateName.nodesConterText,
          text: '0',
          textAlign: 'center',
          verticalAlignment: go.Spot.Center,
          font: 'bold 15px sans-serif',
        }),
      ))
      .add($(go.Placeholder, { padding: 10, alignment: go.Spot.TopLeft }))
    );

    dia.nodeTemplate = $(go.Node, go.Node.Auto, {
      selectionAdornmentTemplate:
        $(go.Adornment, go.Adornment.Auto,
          $(go.Shape, { fill: null, stroke: utils.selectStroke(NodeType.device), strokeWidth: 3 }),
          $(go.Placeholder),
        ),
    });

    dia.nodeTemplate.add($(go.Shape, go.Geometry.Rectangle, {
      stroke: utils.zoneStroke(null),
      fill: utils.zoneFill(null),
      strokeWidth: 2,
    })
      .bind('fill', 'type', utils.zoneFill)
      .bind('stroke', 'type', utils.zoneStroke),
    );

    dia.nodeTemplate.add($(go.Panel, go.Panel.Vertical).add(
      $(go.TextBlock, {
        name: DiagramTemplateName.unitTitle,
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

  public diagramModelChange(changes: go.IncrementalData) {
    if (!changes) {
      return;
    }
  };

  public initOverview(): go.Overview {
    const $ = go.GraphObject.make;
    const overview = $(go.Overview);
    return overview;
  }

  public ngAfterViewInit() {
    if (this.observedDiagram) {
      return;
    }
    this.observedDiagram = this.myDiagramComponent.diagram;
    this.cdr.detectChanges();

    this.myDiagramComponent.diagram.addDiagramListener('ChangedSelection', (e) => {
      // TODO: Implement 'ChangedSelection' event
    });

    const zoneTitle = this.myDiagramComponent.diagram.groupTemplate.findObject(DiagramTemplateName.zoneTitle) as go.TextBlock;
    zoneTitle.textEdited = this.updateZoneName.bind(this);

    const unitTitle = this.myDiagramComponent.diagram.nodeTemplate.findObject(DiagramTemplateName.unitTitle) as go.TextBlock;
    unitTitle.textEdited = this.updateUnitName.bind(this);

    this.myDiagramComponent.diagram.groupTemplate.mouseDrop = this.updateUnitZoneId.bind(this);

    this.loadZones();
  }

  public addZone(): void {
    this.zonesService.createZone({}).subscribe(() => this.loadZones());
  }

  public deleteZone(): void {
    if (this.keyRootZone) {
      this.myDiagramComponent.diagram.selection.each((zone) => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        this.zonesService.deleteZone({ ID: zone.data.id }).subscribe(() => {
          this.loadZones();
          this.myDiagramComponent.diagram.updateAllRelationshipsFromData();
          this.myDiagramComponent.diagram.commandHandler.deleteSelection();
        });
      }) ;
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

  public updateZoneName(thisTextBlock: go.TextBlock, oldName: string, newName: string): void {
    const grpId = thisTextBlock.panel.panel.panel.data.id;
    if (newName && newName !== oldName) {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      this.zonesService.updateZone({ ID: grpId, Name: newName }).subscribe(() => {
        this.loadZones();
      });
    } else {
      thisTextBlock.text = oldName;
    }
  }

  public updateUnitZoneId(e: go.InputEvent, thisObj: go.GraphObject): void {
    const grp = thisObj as go.Group;
    if (grp !== null && !e.diagram.selection.all(n => n instanceof go.Group)) {
      grp.addMembers(grp.diagram.selection, true);
      grp.diagram.selection.each((device) => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        this.zonesService.updateUnit({ Serial: device.data.id, ZoneID: grp.data.id }).subscribe(() => {
          this.loadZones();
        });
      });
    }
    e.diagram.layoutDiagram(true);
  }

  public updateUnitName(thisTextBlock: go.TextBlock, oldName: string, newName: string): void {
    const unitId = thisTextBlock.panel.panel.data.id;
    if (newName && newName !== oldName) {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      this.zonesService.updateUnit({ Serial: unitId, Name: newName }).subscribe(() => {
        this.loadZones();
      });
    } else {
      thisTextBlock.text = oldName;
    }
  }

  public loadZones(): void {
    this.zonesService.getZoneList().subscribe((zones) => {
      const collapsedGroups: number[] = [];
      this.myDiagramComponent.diagram.nodes.each((node) => {
        if (node instanceof go.Group && node.isSubGraphExpanded === false) {
          collapsedGroups.push(node.data.id);
        }
      });

      this.myDiagramComponent.diagram.model.nodeDataArray = [];
      zones.forEach((zone) => {
        this.myDiagramComponent.diagram.model.addNodeData({
          id: zone.ID,
          key: zone.ID === utils.rootId ? NodeType.rootZone : NodeType.zone,
          text: zone.Name,
          isGroup: true,
          type: ZoneType.type0,
        });
        if (zone.Units) {
          zone.Units.forEach((unit) => {
            this.myDiagramComponent.diagram.model.addNodeData({
              id: unit.Info.Device.Serial,
              key: NodeType.device,
              text: unit.Info.Name,
              group: zone.ID,
              type: unit.Online ? ZoneType.type1 : ZoneType.type4,
            });
          });
        }
      });

      this.myDiagramComponent.diagram.nodes.each((node) => {
        if (node instanceof go.Group && collapsedGroups.includes(node.data.id)) {
          node.isSubGraphExpanded = false;
        }
      });
    });
  }
}
