interface BlueprintHeaderProps {
  viewBoxWidth: number;
  padding: number;
  width: number;
  height: number;
  depth: number;
  thicknessMm: number;
  scaleRatio: number;
}

export function BlueprintHeader({
  viewBoxWidth,
  padding,
  width,
  height,
  depth,
  thicknessMm,
  scaleRatio,
}: BlueprintHeaderProps) {
  return (
    <g>
      <text
        x={viewBoxWidth / 2}
        y={30}
        fontSize="18"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        textAnchor="middle"
      >
        Tehnički crtež - Orman
      </text>
      <text x={padding} y={55} fontSize="10" fontFamily="Arial, sans-serif">
        Dimenzije: {width} × {height} × {depth} cm
      </text>
      <text
        x={padding + 200}
        y={55}
        fontSize="10"
        fontFamily="Arial, sans-serif"
      >
        Debljina ploče: {thicknessMm} mm
      </text>
      <text
        x={padding + 380}
        y={55}
        fontSize="10"
        fontFamily="Arial, sans-serif"
      >
        Mere u cm
      </text>
      <text
        x={viewBoxWidth - padding}
        y={55}
        fontSize="10"
        fontFamily="Arial, sans-serif"
        textAnchor="end"
      >
        Razmer 1:{scaleRatio}
      </text>
    </g>
  );
}
