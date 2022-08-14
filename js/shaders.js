import { ShaderMaterial } from "three";

var CustomShader = new ShaderMaterial({
    vertexShader: [
        "varying vec3 vColor;",
        "attribute float scale;",
        "void main(){",
        "vColor = color;",
        "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
        "gl_PointSize = scale * ( 300.0 / - mvPosition.z );",
        "gl_Position = projectionMatrix * mvPosition;",
        "}"
    ].join("\n"),

    fragmentShader: [
        "varying vec3 vColor;",
        "void main(){",
        "if ( length( gl_PointCoord - vec2( 0.5, 0.5 ) ) > 0.475 ) discard;",
        "gl_FragColor = vec4( vColor.rgb, 1.0 );",
        "}",
    ].join("\n"),
});
CustomShader.vertexColors = True;

export { CustomShader };
