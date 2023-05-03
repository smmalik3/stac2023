const AWS = require('aws-sdk');
const fs = require('fs');
const textract = new AWS.Textract();
const {Configuration,OpenAIApi} = require("openai");

module.exports.readS3File = async (event) => {
  // Get the name of the file to be processed from the event object
  const filename = event.Records[0].s3.object.key;

  console.log("filename ==========>>>>>> " + filename)
  // Create an instance of the S3 client
  const s3 = new AWS.S3();

  // Set the parameters for the getObject method to retrieve the file from S3
  const params = {
    Bucket: event.Records[0].s3.bucket.name,
    Key: filename,
  };

  try {
    // Use the getObject method to retrieve the file from S3
    const s3Response = await s3.getObject(params).promise();
    
    // Get the file path of the file
    const filePath = `/tmp/${filename}`;
    
    // Write the file to the local file system
    const fileContent = s3Response.Body;
    fs.writeFileSync(filePath, fileContent);

    console.log("File Uploaded Successfully")
    console.log("Filename =====>>> " + filename)
    console.log("Filepath =====>>> " + filePath)

    // Send file to Amazon Textract
    // Set the parameters for the analyzeDocument method
    const textractParams = {
      Document: {
        Bytes: fileContent,
      }
    };

    try {
      // Call the detectDocumentText method to start looking for text in the uplodaed file
      const response = await textract.detectDocumentText(textractParams).promise();
      console.log(response);
      
      // Extract the text from the response
      const text = response.Blocks.reduce((acc, block) => {
        if (block.BlockType === 'LINE') {
          acc += `${block.Text}\n`;
        }
        return acc;
      }, '');

      console.log("TEXT FROM TEXTRACT ======================>>>>>>>>>> " + text);

      // return text;

      const configuration = new Configuration({
          apiKey: process.env.OPENAI_API_KEY,
      });
      const openai = new OpenAIApi(configuration);

      async function runCompletion() {
          const userPrompt = "Can you create a job description for a Software Engineer working at Deloitte Digital with 3 years experience?"
          const creativity = 0.7 // change this between 0.0 and 1.0, 1.0 being most creative output
          // console.log('USER PROMPT LENGTH ---> ' + userPrompt.length)
          console.log("Prompt sent to ChatGPT: ")
          console.log(userPrompt)
          console.log("Waiting for ChatGPT's response...")
          console.log("_________________________________")
          try {
            const completion = await openai.createCompletion({
                model: 'text-davinci-003',
                temperature: creativity,
                max_tokens: 2048,
                frequency_penalty: 0.0,
                presence_penalty: 0,
                prompt: userPrompt,
            });
            // console.log(completion.data)
            console.log("Response from Completion Run =======>>>>> " +completion.data.choices[0].text);
          } catch (error) {
            console.error(error);
          }
          if (completion.data.choices[0].text != null) {
            response = completion.data.choices[0].text
            console.log("CHATGPT RESPONSE ==========>>>>>>> " + response)
          } else {
            console.log("No response from ChatGPT")
          }
      }

      try {
        runCompletion();
      } catch (error) {
        console.log("CHATGPT ERROR: " + error)
      }

    } catch (error) {
      console.error(error);
      throw error;
    }

  } catch (error) {
    console.error(error);
    throw error;
  }
};