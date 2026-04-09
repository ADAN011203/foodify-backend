import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: process.env.AWS_S3_REGION || 'us-east-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const bucketName = process.env.AWS_S3_BUCKET;
    if (!bucketName) {
      throw new InternalServerErrorException('AWS S3 bucket not configured');
    }

    const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Remove spaces and normalize special characters
    const extension = file.originalname.split('.').pop();
    const fileName = `uploads/${uniqueId}.${extension}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return `https://${bucketName}.s3.${process.env.AWS_S3_REGION || 'us-east-2'}.amazonaws.com/${fileName}`;
    } catch (error) {
      this.logger.error('Error uploading file to S3', error);
      throw new InternalServerErrorException('Could not upload file to S3');
    }
  }
}
