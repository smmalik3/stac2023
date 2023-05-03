const AWS = require('aws-sdk');
const fs = require('fs');
const textract = new AWS.Textract();

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
      },
      FeatureTypes: ['TABLES', 'FORMS'],
    };
    try {
      // Call the analyzeDocument method and wait for the response
      const response = await textract.analyzeDocument(textractParams).promise();
      console.log(response);
      return response;
    } catch (error) {
      console.error(error);
      throw error;
    }

  } catch (error) {
    console.error(error);
    throw error;
  }
};
