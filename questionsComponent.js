import { questions } from "./questions";

const choicesTags = ["a)", "b)", "c)", "d)"];

export function setQuestion(index) {
  const choices = 4;

  const title = document.getElementById("game-header");
  title.innerText = "Question " + index;

  const container = document.querySelector(".game-container");
  container.innerHTML = "";
  const text = document.createElement("p");
  text.innerText = questions[index - 1].question;

  const choicesList = document.createElement("ul");
  choicesList.classList.add("choices");
  questions[index - 1].choices.forEach((choice, index) => {
    const choiceEl = document.createElement("li");
    choiceEl.innerText = choice;

    const choiceTag = document.createElement("span");
    choiceTag.classList.add("answer-tag");
    choiceTag.innerText = choicesTags[index];
    choiceEl.appendChild(choiceTag);
    choicesList.appendChild(choiceEl);
  });

  container.appendChild(text);
  container.appendChild(choicesList);
}

export function setTimer(secs) {
  const timer = document.getElementById("timer");
  timer.style.display = "flex";
  timer.innerText = secs;
}
