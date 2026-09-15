const API_BASE_URL =
    "https://amazon-rainforest-api.onrender.com";

const PREDICT_URL =
    `${API_BASE_URL}/predict`;


/* =========================
   ELEMENTS
========================= */

const imageInput =
    document.getElementById("image-input");

const dropArea =
    document.getElementById("drop-area");

const previewSection =
    document.getElementById("preview-section");

const imagePreview =
    document.getElementById("image-preview");

const fileName =
    document.getElementById("file-name");

const analyzeBtn =
    document.getElementById("analyze-btn");

const removeBtn =
    document.getElementById("remove-btn");

const loading =
    document.getElementById("loading");

const results =
    document.getElementById("results");

const resultImage =
    document.getElementById("result-image");

const predictionList =
    document.getElementById("prediction-list");

const newAnalysis =
    document.getElementById("new-analysis");

const serverStatus =
    document.getElementById("server-status");

const statusText =
    document.getElementById("status-text");


let selectedFile = null;

let serverReady = false;


/* =========================
   WAKE RENDER
========================= */

async function wakeServer() {

    serverReady = false;

    setServerStatus(
        "checking",
        "Waking AI server..."
    );


    try {

        const startTime =
            Date.now();


        const response =
            await fetch(
                `${API_BASE_URL}/`,
                {
                    method: "GET",

                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );

        }


        const elapsed =
            (
                (Date.now() - startTime)
                / 1000
            ).toFixed(1);


        const data =
            await response.json();


        console.log(
            "AI server:",
            data
        );


        serverReady = true;


        setServerStatus(
            "ready",
            `AI server ready • ${elapsed}s`
        );


    } catch (error) {

        console.error(
            "Server error:",
            error
        );


        setServerStatus(
            "error",
            "Server unavailable • Click to retry"
        );

    }

}


/* =========================
   STATUS
========================= */

function setServerStatus(
    type,
    message
) {

    serverStatus.classList.remove(
        "checking",
        "ready",
        "error"
    );


    serverStatus.classList.add(
        type
    );


    statusText.textContent =
        message;

}


/* =========================
   CLICK STATUS TO RETRY
========================= */

serverStatus.addEventListener(
    "click",
    function () {

        if (!serverReady) {

            wakeServer();

        }

    }
);


/* =========================
   WAKE SERVER ON PAGE LOAD
========================= */

wakeServer();


/* =========================
   SELECT IMAGE
========================= */

imageInput.addEventListener(
    "change",
    function () {

        if (this.files.length > 0) {

            handleFile(
                this.files[0]
            );

        }

    }
);


/* =========================
   DRAG OVER
========================= */

dropArea.addEventListener(
    "dragover",
    function (event) {

        event.preventDefault();

        dropArea.classList.add(
            "dragging"
        );

    }
);


/* =========================
   DRAG LEAVE
========================= */

dropArea.addEventListener(
    "dragleave",
    function () {

        dropArea.classList.remove(
            "dragging"
        );

    }
);


/* =========================
   DROP
========================= */

dropArea.addEventListener(
    "drop",
    function (event) {

        event.preventDefault();

        dropArea.classList.remove(
            "dragging"
        );


        const file =
            event.dataTransfer.files[0];


        if (file) {

            handleFile(file);

        }

    }
);


/* =========================
   HANDLE IMAGE
========================= */

function handleFile(file) {

    if (!file.type.startsWith("image/")) {

        alert(
            "Please select a JPG or PNG image."
        );

        return;

    }


    selectedFile = file;


    const reader =
        new FileReader();


    reader.onload =
        function (event) {

            imagePreview.src =
                event.target.result;

            resultImage.src =
                event.target.result;

        };


    reader.readAsDataURL(file);


    fileName.textContent =
        file.name;


    dropArea.classList.add(
        "hidden"
    );


    previewSection.classList.remove(
        "hidden"
    );

}


/* =========================
   ANALYZE
========================= */

analyzeBtn.addEventListener(
    "click",
    async function () {

        if (!selectedFile) {

            alert(
                "Please select an image first."
            );

            return;

        }


        /*
         * If Render has not finished
         * waking up, wait for it.
         */

        if (!serverReady) {

            await wakeServer();

        }


        if (!serverReady) {

            alert(
                "AI server is not ready. Please try again."
            );

            return;

        }


        previewSection.classList.add(
            "hidden"
        );


        loading.classList.remove(
            "hidden"
        );


        setServerStatus(
            "checking",
            "AI is analyzing the image..."
        );


        try {

            const formData =
                new FormData();


            formData.append(
                "image",
                selectedFile
            );


            const response =
                await fetch(
                    PREDICT_URL,
                    {
                        method: "POST",

                        body: formData
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `API error: ${response.status}`
                );

            }


            const data =
                await response.json();


            console.log(
                "Prediction response:",
                data
            );


            displayResults(
                data
            );


            setServerStatus(
                "ready",
                "AI analysis complete"
            );


        } catch (error) {

            console.error(
                "Prediction error:",
                error
            );


            loading.classList.add(
                "hidden"
            );


            previewSection.classList.remove(
                "hidden"
            );


            setServerStatus(
                "error",
                "Analysis failed • Click to retry"
            );


            alert(
                "Unable to analyze the image. Please try again."
            );

        }

    }
);


/* =========================
   DISPLAY RESULTS
========================= */

function displayResults(data) {

    loading.classList.add(
        "hidden"
    );


    results.classList.remove(
        "hidden"
    );


    predictionList.innerHTML =
        "";


    if (
        !data.predictions ||
        data.predictions.length === 0
    ) {

        predictionList.innerHTML = `

            <div class="info-box">

                <strong>
                    No classes detected
                </strong>

                <p>
                    No prediction passed the
                    configured confidence threshold.
                </p>

            </div>

        `;

        return;

    }


    data.predictions.forEach(
        prediction => {

            const label =
                prediction.label;


            const confidence =
                prediction.confidence;


            const percentage =
                Math.round(
                    confidence * 100
                );


            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "prediction";


            div.innerHTML = `

                <div class="prediction-top">

                    <span>
                        ${formatLabel(label)}
                    </span>

                    <span class="confidence">
                        ${percentage}%
                    </span>

                </div>


                <div class="progress">

                    <div
                        class="progress-bar"
                        style="width: ${percentage}%"
                    ></div>

                </div>

            `;


            predictionList.appendChild(
                div
            );

        }
    );

}


/* =========================
   FORMAT LABEL
========================= */

function formatLabel(label) {

    return label
        .replaceAll("_", " ")
        .replace(
            /\b\w/g,
            char => char.toUpperCase()
        );

}


/* =========================
   RESET
========================= */

removeBtn.addEventListener(
    "click",
    reset
);


newAnalysis.addEventListener(
    "click",
    reset
);


function reset() {

    selectedFile = null;

    imageInput.value = "";


    results.classList.add(
        "hidden"
    );


    loading.classList.add(
        "hidden"
    );


    previewSection.classList.add(
        "hidden"
    );


    dropArea.classList.remove(
        "hidden"
    );


    predictionList.innerHTML =
        "";


    if (serverReady) {

        setServerStatus(
            "ready",
            "AI server ready"
        );

    }

}