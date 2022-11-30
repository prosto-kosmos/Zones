import * as go from 'gojs';
import { NodeType } from '../enums/node-type.enum';
import { ZoneType } from '../enums/zone-type.enum';

// eslint-disable-next-line max-len
export const cloudPath = 'M6.5 20Q4.22 20 2.61 18.43 1 16.85 1 14.58 1 12.63 2.17 11.1 3.35 9.57 5.25 9.15 5.88 6.85 7.75 5.43 9.63 4 12 4 14.93 4 16.96 6.04 19 8.07 19 11 20.73 11.2 21.86 12.5 23 13.78 23 15.5 23 17.38 21.69 18.69 20.38 20 18.5 20M6.5 18H18.5Q19.55 18 20.27 17.27 21 16.55 21 15.5 21 14.45 20.27 13.73 19.55 13 18.5 13H17V11Q17 8.93 15.54 7.46 14.08 6 12 6 9.93 6 8.46 7.46 7 8.93 7 11H6.5Q5.05 11 4.03 12.03 3 13.05 3 14.5 3 15.95 4.03 17 5.05 18 6.5 18M12 12Z';

export const selectStroke = (type: NodeType) => {
  switch (type) {
  case NodeType.zone:
    return 'rgba(0,0,255,0.5)';
  case NodeType.device:
    return 'rgba(0,0,255,0.5)';
  default:
    return 'rgba(0,0,255,0.5)';
  }
};

export const zoneFill = (type: ZoneType) => {
  switch (type) {
  case ZoneType.type0:
    return 'rgba(255,255,255,0)'; // default
  case ZoneType.type1:
    return 'rgba(68,148,74,0.8)'; // normal
  case ZoneType.type2:
    return 'rgba(255,188,64,0.8)'; // failure minor
  case ZoneType.type3:
    return 'rgba(255,188,64,0.8)'; // failure major
  case ZoneType.type4:
    return 'rgba(255,18,30,0.8)'; // failure major anconf
  default:
    return 'rgba(255,255,255,0)'; // default
  }
};

export const zoneStroke = (type: ZoneType) => {
  switch (type) {
  case ZoneType.type0:
    return 'lightgrey'; // default
  case ZoneType.type1:
    return 'rgba(68,148,74,0.8)'; // normal
  case ZoneType.type2:
    return 'rgba(255,188,64,0.8)'; // failure minor
  case ZoneType.type3:
    return 'rgba(255,0,0,1)'; // failure major
  case ZoneType.type4:
    return 'rgba(255,18,30,0.8)'; // failure major anconf
  default:
    return 'lightgrey'; // default
  }
};

export const highlightGroup = (e: go.InputEvent, graphObject: go.GraphObject, show: boolean) => {
  const grp = graphObject as go.Group;
  if (!grp) {
    return;
  }
  e.handled = true;
  if (show && !e.diagram.selection.all(n => n instanceof go.Group)) {
    const tool = grp.diagram.toolManager.draggingTool;
    const map = tool.draggedParts || tool.copiedParts;
    if (grp.canAddMembers(map.toKeySet())) {
      grp.isHighlighted = true;
      return;
    }
  }
  grp.isHighlighted = false;
};

export const finishDrop = (e: go.InputEvent, graphObject: go.GraphObject) => {
  const grp = graphObject as go.Group;
  if (grp !== null && !e.diagram.selection.all(n => n instanceof go.Group)) {
    grp.addMembers(grp.diagram.selection, true);
  }
  e.diagram.layoutDiagram(true);
};

export const updateGroupCount = (grp: go.Group) => {
  const nodesCounter = grp.findObject('nodes_counter') as go.TextBlock;
  nodesCounter.text = grp.memberParts.filter((p) => p instanceof go.Node).count.toString();
};

export const groupExpandedChanged = (grp: go.Group) => {
  const hiddenPanel = grp.findObject('hidden_panel') as go.Panel;
  const zoneName = grp.findObject('zone_name') as go.TextBlock;
  const expanderButton = grp.findObject('expander_button');
  const zonePanel = grp.findObject('zone_panel') as go.Shape;
  hiddenPanel.visible = !grp.isSubGraphExpanded;
  zoneName.visible = grp.isSubGraphExpanded;
  expanderButton.visible = grp.isSubGraphExpanded;
  if (grp.isSubGraphExpanded) {
    zonePanel.fill = zoneFill(null);
    zonePanel.stroke = zoneStroke(null);
  } else {
    // TODO: Set group color
  }
};

export const groupClick = (grp: go.Group) => {
  if (!grp.isSubGraphExpanded) {
    grp.expandSubGraph();
  }
};
