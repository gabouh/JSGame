precision mediump float;

uniform vec2 resolution;

float map(float val, float minIn, float maxIn, float minOut, float maxOut) {
	return minIn + (maxOut - minOut) * ((val - minIn) / (maxIn - minIn));
}

void main( void )
{
	float maxIter = 20.0;

	float minV = -1.0;
	float maxV = 1.0;

	float a = map(gl_FragCoord.x - resolution.x / 2.0, 0.0, resolution.x, minV, maxV);
	float b = map(gl_FragCoord.y - resolution.y / 2.0, 0.0, resolution.y, minV, maxV);

	//float ca = map(touch.x, 0.0, resolution.x, 0.0, 2.0 * time);
	//float cb = map(touch.y, 0.0, resolution.y, 0.0, 2.0 * time);

	float ca = a;
	float cb = b;

	float tmp = 0.0;
	for (float i = 0.0 ; i < 64.0 ; i += 1.0) {
	    if (i > maxIter) {
	        break;
	    }
		float aa = a * a - b * b;
		float bb = 2.0 * a * b;

		a = aa + ca;
		b = bb + cb;

		if (a * a + b  * b > 16.0) {
			break;
		}
	}

	float brightness = map(tmp, 0.0, maxIter, 0.0, 1.0);
	brightness = sqrt(brightness);

	gl_FragColor = vec4(brightness, brightness, brightness, 1.0);
}