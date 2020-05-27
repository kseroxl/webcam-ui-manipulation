/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as tf from "@tensorflow/tfjs";
import * as tfd from "@tensorflow/tfjs-data";

import * as modelTrainer from "./modelTrainer";
import * as ui from "./ui";
import * as questionsComponent from "./questionsComponent";
import { questions } from "./questions";
import { steps } from "./steps";

const next = document.getElementById("next");
const predictEl = document.getElementById("predict");

let step = 1;

ui.setExampleHandler(async (label) => {
  let img = await modelTrainer.getImage();

  modelTrainer.controllerDataset.addExample(
    modelTrainer.truncatedMobileNet.predict(img),
    label
  );

  // Draw the preview thumbnail.
  ui.drawThumb(img, label);
  img.dispose();
});

function show() {
  next.style.display = "inline-block";
}

function setStep() {
  const stepElement = document.querySelector(".step");
  const span = stepElement.querySelector("span");
  span.innerText = step;

  const instruction = document.getElementById("instruction-text");
  instruction.innerText = steps[step - 1];
}

setStep();

document.getElementById("train").addEventListener("click", async () => {
  ui.trainStatus("Training...");
  await tf.nextFrame();
  await tf.nextFrame();
  modelTrainer.setPredicting(false);
  modelTrainer.train(show);
});

let question = 1;
let predicted;
console.log(questions.length);

function incrementQuestion(element) {
  console.log("PREDICTED = " + element);
  predicted = element;
  const list = document.getElementsByClassName("choices")[0];
  list.childNodes[parseInt(element)].style.border = "2px solid #00b4d8";
}

function clearBorders() {
  const list = document.getElementsByClassName("choices")[0];
  list.childNodes.forEach((node) => {
    node.style.border = "none";
  });
}

let time = 7;
let goodAnswers = 0;

function answerQuestion(index) {
  setTimeout(() => {
    modelTrainer.setPredicting(true);
    modelTrainer.predict(incrementQuestion);
  }, 6000);
  setTimeout(() => {
    modelTrainer.setPredicting(false);
  }, 8000);
  setTimeout(() => {
    if (
      questions[question - 1].choices[predicted] ==
      questions[question - 1].answer
    ) {
      document.getElementsByClassName("choices")[0].childNodes[
        parseInt(predicted)
      ].style.background = "green";
      goodAnswers++;
    } else {
      document.getElementsByClassName("choices")[0].childNodes[
        parseInt(predicted)
      ].style.background = "red";
    }
  }, 9000);
  setTimeout(() => {
    clearBorders();
    question++;
    if (question == questions.length + 1) {
      finish();
      return;
    }
    questionsComponent.setQuestion(question);
  }, 10000);
}

predictEl.addEventListener("click", () => {
  if (step == 3) {
    window.location.reload();
  } else {
    document.querySelector(".game-container").style.display = "block";
    step++;
    setStep();

    answerQuestion();
    questionsComponent.setQuestion(question);

    const timerId = setInterval(() => {
      if (time == -3) time = 7;
      if (time > 0) questionsComponent.setTimer(time--);
      else {
        questionsComponent.setTimer("0");
        time--;
      }
    }, 1000);

    const timerQuestionsId = setInterval(() => {
      answerQuestion();
    }, 10000);

    setTimeout(() => {
      clearInterval(timerQuestionsId);
    }, 90000);

    setTimeout(() => {
      clearInterval(timerId);
    }, 100000);
    predictEl.style.display = "none";
  }
});

function finish() {
  document.getElementsByTagName("ul")[0].remove();
  document.getElementById("timer").remove();

  const container = document.querySelector(".game-container");
  container.innerHTML = "";

  let text = goodAnswers + "/" + questions.length + "\n";
  if (goodAnswers / questions.length < 0.5) text += "You could better...";
  else text += "Great job!";
  document.getElementById("game-header").innerText = text;

  predictEl.style.display = "block";
  predictEl.innerText = "Play again";
  predictEl.classList.add("playBtn");
}

document.getElementById("error").addEventListener("click", () => {
  document.getElementById("error").style.display = "none";
});

next.addEventListener("click", () => {
  document.querySelector(".hyper-params").remove();
  document.querySelector("#train").remove();
  document.querySelector(".train-model-container").classList.add("corner");
  document.getElementById("error").style.display = "none";
  next.style.display = "none";
  predictEl.classList.add("playBtn");
  predictEl.style.display = "block";

  step++;
  setStep();
});

modelTrainer.init();
