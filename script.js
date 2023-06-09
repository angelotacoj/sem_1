const elVideo = document.getElementById('video')

const positiveEmotions = ['neutral', 'happy']
const negativeEmotions = ['angry', 'disgusted']

const isPositiveEmotion = (emotion) => positiveEmotions.includes(emotion)
const isNegativeEmotion = (emotion) => negativeEmotions.includes(emotion)

const shouldUpdateUI = (prev, current) => {
    console.log(`${prev} vs. ${current}`)
    if (isPositiveEmotion(prev) && isNegativeEmotion(current)) return true
    if (isNegativeEmotion(prev) && isPositiveEmotion(current)) return false
    if (isNegativeEmotion(prev) && isNegativeEmotion(current)) return true
    if (isPositiveEmotion(prev) && isPositiveEmotion(current)) return false
}

let lastEmotion = localStorage.getItem('emotion') || 'neutral'
document.body.setAttribute('data-emotion', lastEmotion)

navigator.getMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia)

const cargarCamera = () => {
    navigator.getMedia(
        {
            video: true,
            audio: false
        },
        stream => elVideo.srcObject = stream,
        console.error
    )
}

// Cargar Modelos
Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    faceapi.nets.ageGenderNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
]).then(cargarCamera)

elVideo.addEventListener('play', async () => {
    // creamos el canvas con los elementos de la face api
    const canvas = faceapi.createCanvasFromMedia(elVideo)
    // lo añadimos al body
    document.body.append(canvas)

    // tamaño del canvas
    const displaySize = { width: elVideo.width, height: elVideo.height }
    faceapi.matchDimensions(canvas, displaySize)

    setInterval(async () => {
        // hacer las detecciones de cara
        const detections = await faceapi.detectAllFaces(elVideo)
            .withFaceLandmarks()
            .withFaceExpressions()
            // .withAgeAndGender()
            // .withFaceDescriptors()

        if (detections.length < 0) return
        if (!detections[0]?.expressions) return

        // console.log('--- detections[0].expressions =', detections[0].expressions)
        const predominant =  Object.entries(detections[0].expressions).reduce((acc, [key, value]) => {
            if (value > acc.value) {
              return { key, value };
            }
            return acc;
          }, { key: null, value: -Infinity }).key


        if (shouldUpdateUI(lastEmotion, predominant)) {
            document.body.setAttribute('data-emotion', predominant)
            lastEmotion = predominant
            localStorage.setItem('emotion', predominant)
        }

        console.log('--- lastEmotion =', lastEmotion)
        console.log('--- predominant =', predominant)
        
        // ponerlas en su sitio
        const resizedDetections = faceapi.resizeResults(detections, displaySize)

        // limpiar el canvas
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)

        // dibujar las líneas
        // faceapi.draw.drawDetections(canvas, resizedDetections)
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections)

        resizedDetections.forEach(detection => {
            const box = detection.detection.box
            new faceapi.draw.DrawBox(box, {
                label: predominant
            }).draw(canvas)
        })
    }, 5000)
})