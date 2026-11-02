import { HEX_GRID_SIZE, axialToPixel } from "./definitions.js?v=1.0.0";

const NEIGHBORS = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];

// Draw only exposed edges, so the outline follows the actual honeycomb instead
// of enclosing other branches or leaving artificial space between their cells.
export function hexBoundarySegments(nodes,size = HEX_GRID_SIZE) {
  const occupied = new Set(nodes.map(node => `${node.q},${node.r}`));
  return nodes.flatMap(node => {
    const { x,y } = axialToPixel(node.q,node.r,size);
    return NEIGHBORS.flatMap(([q,r],edge) => {
      if (occupied.has(`${node.q+q},${node.r+r}`)) return [];
      const a = edge*Math.PI/3, b = (edge+1)*Math.PI/3;
      return [{ x1:x+Math.cos(a)*size,y1:y+Math.sin(a)*size,x2:x+Math.cos(b)*size,y2:y+Math.sin(b)*size }];
    });
  });
}
