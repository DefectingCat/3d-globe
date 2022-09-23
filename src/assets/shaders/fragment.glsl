uniform sample2D globeTexture;

varying vec2 vertexUV;

void main() {
    // gl_FragColor = vec4(1, 0, 0, 1);
    gl_FragColor = texture2D(globeTexture, vertexUV);
}
