import * as tf from "@tensorflow/tfjs";
import * as tfd from "@tensorflow/tfjs-data";
import * as ui from "./ui";
import { ControllerDataset } from "./controller_dataset";

export let webcam;
export let truncatedMobileNet;

const NUM_CLASSES = 4;
let isPredicting = false;
let model;

export const controllerDataset = new ControllerDataset(NUM_CLASSES);

export async function init() {
  try {
    webcam = await tfd.webcam(document.getElementById("webcam"));
  } catch (e) {
    console.log(e);
    document.getElementById("no-webcam").style.display = "block";
  }
  truncatedMobileNet = await loadTruncatedMobileNet();

  ui.init();

  // Warm up the model. This uploads weights to the GPU and compiles the WebGL
  // programs so the first time we collect data from the webcam it will be
  // quick.
  const screenShot = await webcam.capture();
  truncatedMobileNet.predict(screenShot.expandDims(0));
  screenShot.dispose();
}

async function loadTruncatedMobileNet() {
  const mobilenet = await tf.loadLayersModel(
    "https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json"
  );

  // Return a model that outputs an internal activation.
  const layer = mobilenet.getLayer("conv_pw_13_relu");
  return tf.model({ inputs: mobilenet.inputs, outputs: layer.output });
}

export async function getImage() {
  const img = await webcam.capture();
  const processedImg = tf.tidy(() =>
    img.expandDims(0).toFloat().div(127).sub(1)
  );
  img.dispose();
  return processedImg;
}

export function setPredicting(value) {
  isPredicting = value;
}

export async function train(callback) {
  if (controllerDataset.xs == null) {
    let errorText = "Add some examples before training!";
    const error = document.querySelector("#error");
    error.style.display = "block";
    error.innerHTML = errorText + `<span class="cross">&times;</span>`;
    document.getElementById("train-status").innerText = "TRAIN MODEL";
    throw new Error(errorText);
  }

  model = tf.sequential({
    layers: [
      tf.layers.flatten({
        inputShape: truncatedMobileNet.outputs[0].shape.slice(1),
      }),

      tf.layers.dense({
        units: ui.getDenseUnits(),
        activation: "relu",
        kernelInitializer: "varianceScaling",
        useBias: true,
      }),
      tf.layers.dense({
        units: NUM_CLASSES,
        kernelInitializer: "varianceScaling",
        useBias: false,
        activation: "softmax",
      }),
    ],
  });

  const optimizer = tf.train.adam(ui.getLearningRate());
  model.compile({ optimizer: optimizer, loss: "categoricalCrossentropy" });

  const batchSize = Math.floor(
    controllerDataset.xs.shape[0] * ui.getBatchSizeFraction()
  );
  if (!(batchSize > 0)) {
    throw new Error(
      `Batch size is 0 or NaN. Please choose a non-zero fraction.`
    );
  }

  model.fit(controllerDataset.xs, controllerDataset.ys, {
    batchSize,
    epochs: ui.getEpochs(),
    callbacks: {
      onBatchEnd: async (batch, logs) => {
        ui.trainStatus("Loss: " + logs.loss.toFixed(5));
      },
    },
  });

  callback();
}

function findMode(arr) {
  var numMapping = {};
  for (var i = 0; i < arr.length; i++) {
    if (numMapping[arr[i]] === undefined) {
      numMapping[arr[i]] = 0;
    }
    numMapping[arr[i]] += 1;
  }

  var greatestFreq = 0;
  var mode;
  for (var prop in numMapping) {
    if (numMapping[prop] > greatestFreq) {
      greatestFreq = numMapping[prop];
      mode = prop;
    }
  }
  return parseInt(mode);
}

export async function predict(callback) {
  ui.isPredicting();
  const classes = [];

  while (isPredicting) {
    // Capture the frame from the webcam.
    const img = await getImage();

    // Make a prediction through mobilenet, getting the internal activation of
    // the mobilenet model, i.e., "embeddings" of the input images.
    const embeddings = truncatedMobileNet.predict(img);

    // Make a prediction through our newly-trained model using the embeddings
    // from mobilenet as input.
    const predictions = model.predict(embeddings);

    // Returns the index with the maximum probability. This number corresponds
    // to the class the model thinks is the most probable given the input.
    const predictedClass = predictions.as1D().argMax();
    const classId = (await predictedClass.data())[0];
    classes.push(classId);
    img.dispose();

    ui.predictClass(classId);
    await tf.nextFrame();
  }
  callback(findMode(classes));
  // console.log();
  ui.donePredicting();
  return await findMode(classes);
}
