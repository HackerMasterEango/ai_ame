const robot = require('robotjs');
const cv = require('@u4/opencv4nodejs');
const tesseract = require("node-tesseract-ocr")
const { YoutubeTranscript } = require('youtube-transcript');
const fs = require('fs');
const { Builder, Browser, By, Key, until } = require('selenium-webdriver');



const Jimp = require('jimp');



const getQuestion = async () => {
    // // Define the region of the screen containing the chat box
    const chatBoxRegion = new cv.Rect(30, 300, 600, 500);

    const config = {
        lang: "eng", // default
    }

    const width = chatBoxRegion.width;
    const height = chatBoxRegion.height;
    const fileName = 'images/question.png';

    const img = robot.screen.capture(chatBoxRegion.x, chatBoxRegion.y, width, height).image;
    await new Jimp({ data: img, width, height }, (err, image) => {
        image.write(fileName);
    });


    let text = await tesseract.recognize(`E:\\codes\\beidouPlaysDota\\ameliaWatsonTraining\\images\\question.png`, config)

    text = text.split("thank you! #ameliaRT")[0];

    // replace | with "I"
    text = text.replace(/\|/g, 'I');

    // replace new line with empty string
    text = text.replace(/\r\n/g, '');

    // replace multiple spaces with single space
    text = text.replace(/\s+/g, ' ');

    return text;
}


const getTranscript = async (vidIds) => {
    let transcript_log = [];
    for (let vidId of vidIds) {
        try {
            const log = await YoutubeTranscript.fetchTranscript(vidId);
            transcript_log = transcript_log.concat(log);
        } catch (error) {
            console.log(error);
        }
    }

    // combine transcript_log list into one string
    const transcript = transcript_log.map((item) => item.text).join(" ");


    // replace ever occurence of strings like [Music] and [Applause] with empty string
    const transcript_clean = transcript.replace(/\[.*?\]/g, '');


    // save to transcript.txt
    fs.writeFile('transcript.txt', transcript_clean, function (err) {
        if (err) throw err;
        console.log('Saved!');
    });

    return transcript_clean;
}


const saveQuestions = async (vidIds) => {

    let driver = await new Builder().forBrowser(Browser.FIREFOX).build();

    // install addon
    await driver.installAddon('adblock_plus.xpi', true);

    const questions = [];

    try {
        for (let vidId of vidIds) {
            for (let time = 0; time < 3300; time += 50) {
                await new Promise(resolve => setTimeout(resolve, 2000));

                await driver.get(`https://www.youtube.com/watch?v=${vidId}&t=${time}`);

                await new Promise(resolve => setTimeout(resolve, 5000));

                // click class ytp-fullscreen-button ytp-button
                await driver.findElement(By.className("ytp-fullscreen-button ytp-button")).click();


                await new Promise(resolve => setTimeout(resolve, 2000));
                // get the question
                const question = await getQuestion();
                questions.push(question);
            }
        }

        // remove duplicate items in questions
        const uniqueQuestions = [...new Set(questions)];

        // add questions to file
        fs.writeFile('questions.txt', uniqueQuestions.join("\n===========================\n"), function (err) {
            if (err) throw err;
            console.log('Saved!');
        });

    } finally {
        await driver.quit();


    }
};

const getPromptCompletions = async (vidIds) => {
    // put questions.txt in list
    const questions = fs.readFileSync('questions.txt', 'utf8').split("\n===========================\n");
    const transcript = await getTranscript(vidIds);


    // get strings in between questions in the transcript
    const promptCompletions = [];
    for (let i = 0; i < questions.length - 1; i++) {
        // replace punctuation like ?,!,. with empty string
        const question = questions[i].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~\?()]/g, "");

        // only take the last 5 words of the question
        const questionWords = question.split(" ");
        const questionWordsLength = questionWords.length;
        const questionLast5Words = questionWords.slice(questionWordsLength - 5, questionWordsLength).join(" ");

        const nextQuestion = questions[i + 1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~\?()]/g, "");

        // only take the first 5 words of the question
        const nextQuestionWords = nextQuestion.split(" ");
        const nextQuestionFirst5Words = nextQuestionWords.slice(0, 5).join(" ");



        const questionIndex = transcript.indexOf(questionLast5Words);
        const nextQuestionIndex = transcript.indexOf(nextQuestionFirst5Words);

        if (questionIndex == -1 || nextQuestionIndex == -1) {
            console.log("question not found");
            continue;
        }

        let promptCompletion = transcript.substring(questionIndex + questionLast5Words.length, nextQuestionIndex);

        // no more than 1329 characters
        if (promptCompletion.length > 1329) {
            promptCompletion = promptCompletion.substring(0, 1329);
        }

        promptCompletions.push({
            prompt: question,
            completion: promptCompletion
        });
    }

    // add promptCompletion to json file with pretty format
    fs.writeFile('promptCompletions.json', JSON.stringify(promptCompletions, null, 4), function (err) {
        if (err) throw err;
        console.log('Saved!');
    });
}



vidIds = [
    'N9G9FfNP20g',
    'rDswj3YxJEI',
    'Nw-zERkXZRk',
    'GkcY1yJ4z3c',
    'JKG7OToMSd4',
    '9JNwpwvd9qQ',
    '983K4eyK16A',
]


// NOTE: only call one of thes functions in comment out other
// ie call saveAllQuestions first, and autocorrect mispellings in questions.txt
// then call getPromptCompletions


// save questions in questions.txt for a video
// saveQuestions(vidIds);

// parse questions
getPromptCompletions(vidIds)
















// const grayscale = screenshot.bgrToGray();


// // Apply a binary threshold to the image
// const thresholded = grayscale.threshold(100, 255, cv.THRESH_BINARY);


// cv.imwrite("E:\\codes\\beidouPlaysDota\\grayscale.png", grayscale);


// // Find contours in the thresholded image
// const contours = thresholded.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

// contours.

// // Filter contours to only keep those that are likely to be text
// const textContours = contours.entries().filter(contour => {
//   const [width, height] = contour.boundingRect.size;
//   const aspectRatio = width / height;
//   const area = contour.area;
//   return aspectRatio > 0.5 && aspectRatio < 2.5 && area > 100;
// });

// console.log(textContours)

// // Extract text from each bounding box
// textContours.forEach(contour => {
//   const [x, y] = contour.boundingRect.tl;
//   const [w, h] = contour.boundingRect.size;
//   const boundingBox = new cv.Rect(x, y, w, h);
//   const textImage = grayscale.getRegion(boundingBox);
//   Tesseract.recognize(textImage)
//     .then(({ data: { text } }) => {
//       console.log(text);
//     });
// });