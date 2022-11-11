import { AfterViewInit, ChangeDetectorRef, Component, ViewChild, ViewEncapsulation } from '@angular/core';
import * as go from 'gojs';
import { DataSyncService, DiagramComponent, PaletteComponent } from 'gojs-angular';
import produce from 'immer';
import { defaultColor, defaultFont, finishDrop, highlightGroup, makeLayout } from './utils/diagram-utils';

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

    // Palette state props
    paletteNodeData: [
      { key: 'node', text: 'Device', color: '#ACE600' },
      { key: 'area1', isGroup: true, text: 'Area', horiz: false },
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
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'clickCreatingTool.archetypeNodeData': {
        text: 'Device',
      },
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'commandHandler.archetypeGroupData': {
        isGroup: true,
        text: 'Group',
        horiz: false,
      },
      layout: new go.GridLayout({
        wrappingWidth: Infinity,
        alignment: go.GridLayout.Position,
        cellSize: new go.Size(1, 1),
      }),
      mouseDrop: (e: any) => finishDrop(e, null),
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
      mouseDragEnter: (e, grp, prev) => highlightGroup(e, grp, true),
      mouseDragLeave: (e, grp, next) => highlightGroup(e, grp, false),
      computesBoundsAfterDrag: true,
      mouseDrop: finishDrop,
      handlesDragDropForMembers: true,
      layout: makeLayout(false),
    })
      .bind('layout', 'horiz', makeLayout)
      .bind(
        new go.Binding('background', 'isHighlighted', (h) =>
          h ? 'rgba(255,0,0,0.2)' : 'transparent'
        ).ofObject()
      )
      .add(
        new go.Shape('Rectangle', {
          stroke: defaultColor(false),
          fill: defaultColor(false),
          strokeWidth: 2,
        })
          .bind('stroke', 'horiz', defaultColor)
          .bind('fill', 'horiz', defaultColor)
      )
      .add(
        new go.Panel('Vertical')
          .add(
            new go.Panel(
              'Horizontal',
              {
                stretch: go.GraphObject.Horizontal,
                background: defaultColor(false),
              }
            )
              .bind('background', 'horiz', defaultColor)
              .add(
                go.GraphObject.make('SubGraphExpanderButton', {
                  alignment: go.Spot.Right,
                  margin: 5,
                })
              )
              .add(
                new go.TextBlock({
                  alignment: go.Spot.Left,
                  editable: true,
                  margin: 5,
                  font: defaultFont(false),
                  opacity: 0.95,
                  stroke: '#404040',
                })
                  .bind('font', 'horiz', defaultFont)
                  .bind('text', 'text', null, null)
              )
          ) // end Horizontal Panel
          .add(new go.Placeholder({ padding: 5, alignment: go.Spot.TopLeft }))
      ); // end Vertical Panel

    dia.nodeTemplate = new go.Node('Vertical', {
      mouseDrop: (e, node: any) => finishDrop(e, node.containingGroup),
    })

      .add(
        new go.TextBlock({
          margin: 7,
          editable: true,
          font: 'bold 13px sans-serif',
        }).bind('text', 'text', null, null)
      )
      .add(
        new go.Picture(
          'https://www.nwoods.com/go/beatpaths/NE_logo-75x50.png',
          {
            desiredSize: new go.Size(48, 48),
            imageStretch: go.GraphObject.Uniform,
            source: 'assets/device.png',
          }
        )
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
    const palette = $(go.Palette);

    palette.groupTemplate = new go.Group('Auto', {
      background: 'blue',
      ungroupable: true,
      mouseDragEnter: (e, grp, prev) => highlightGroup(e, grp, true),
      mouseDragLeave: (e, grp, next) => highlightGroup(e, grp, false),
      computesBoundsAfterDrag: true,
      mouseDrop: finishDrop,
      handlesDragDropForMembers: true,
      layout: makeLayout(false),
    })
      .bind('layout', 'horiz', makeLayout)
      .bind(
        new go.Binding('background', 'isHighlighted', (h) =>
          h ? 'rgba(255,0,0,0.2)' : 'transparent'
        ).ofObject()
      )
      .add(
        new go.Shape('Rectangle', {
          stroke: defaultColor(false),
          fill: defaultColor(false),
          strokeWidth: 2,
        })
          .bind('stroke', 'horiz', defaultColor)
          .bind('fill', 'horiz', defaultColor)
      )
      .add(
        new go.Panel('Vertical')
          .add(
            new go.Panel(
              'Horizontal',
              {
                stretch: go.GraphObject.Horizontal,
                background: defaultColor(false),
              }
            )
              .bind('background', 'horiz', defaultColor)
              .add(
                go.GraphObject.make('SubGraphExpanderButton', {
                  alignment: go.Spot.Right,
                  margin: 5,
                })
              )
              .add(
                new go.TextBlock({
                  alignment: go.Spot.Left,
                  editable: true,
                  margin: 5,
                  font: defaultFont(false),
                  opacity: 0.95,
                  stroke: '#404040',
                })
                  .bind('font', 'horiz', defaultFont)
                  .bind('text', 'text', null, null)
              )
          ) // end Horizontal Panel
          .add(new go.Placeholder({ padding: 5, alignment: go.Spot.TopLeft }))
      ); // end Vertical Panel

    palette.nodeTemplate = new go.Node('Auto', {
      mouseDrop: (e, node: any) => finishDrop(e, node.containingGroup),
    }).add(
      new go.Picture('https://www.nwoods.com/go/beatpaths/NE_logo-75x50.png', {
        desiredSize: new go.Size(48, 48),
        imageStretch: go.GraphObject.Uniform,
        source: 'assets/device.png',
      })
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
