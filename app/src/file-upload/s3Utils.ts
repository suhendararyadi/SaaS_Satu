import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import * as path from "path";
import { env } from "wasp/server";
import { MAX_FILE_SIZE_BYTES } from "./validation";

function getS3Client() {
  if (!env.AWS_S3_REGION || !env.AWS_S3_IAM_ACCESS_KEY || !env.AWS_S3_IAM_SECRET_KEY) {
    throw new Error("Penyimpanan file belum dikonfigurasi.");
  }
  return new S3Client({
    region: env.AWS_S3_REGION,
    ...(env.AWS_S3_ENDPOINT ? { endpoint: env.AWS_S3_ENDPOINT } : {}),
    forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: env.AWS_S3_IAM_ACCESS_KEY,
      secretAccessKey: env.AWS_S3_IAM_SECRET_KEY,
    },
  });
}

function getBucketName() {
  if (!env.AWS_S3_FILES_BUCKET) throw new Error("Bucket penyimpanan file belum dikonfigurasi.");
  return env.AWS_S3_FILES_BUCKET;
}


type S3Upload = {
  fileType: string;
  fileName: string;
  userId: string;
};

export const getUploadFileSignedURLFromS3 = async ({
  fileName,
  fileType,
  userId,
}: S3Upload) => {
  const s3Key = getS3Key(fileName, userId);

  const { url: s3UploadUrl, fields: s3UploadFields } =
    await createPresignedPost(getS3Client(), {
      Bucket: getBucketName(),
      Key: s3Key,
      Conditions: [["content-length-range", 0, MAX_FILE_SIZE_BYTES]],
      Fields: {
        "Content-Type": fileType,
      },
      Expires: 3600,
    });

  return { s3UploadUrl, s3Key, s3UploadFields };
};

export const getDownloadFileSignedURLFromS3 = async ({
  s3Key,
}: {
  s3Key: string;
}) => {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: s3Key,
  });
  return await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
};


export const putBufferToS3 = async ({
  s3Key,
  bytes,
  contentType,
}: {
  s3Key: string;
  bytes: Buffer;
  contentType: string;
}) => {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: s3Key,
    Body: bytes,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });
  await getS3Client().send(command);
  return s3Key;
};

export const getFileBufferFromS3 = async ({ s3Key }: { s3Key: string }) => {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: s3Key,
  });
  const response = await getS3Client().send(command);
  if (!response.Body) return null;
  const bytes = Buffer.from(await response.Body.transformToByteArray());
  return {
    bytes,
    contentType: response.ContentType || "application/octet-stream",
    etag: response.ETag || null,
  };
};

export const deleteFileFromS3 = async ({ s3Key }: { s3Key: string }) => {
  const command = new DeleteObjectCommand({
    Bucket: getBucketName(),
    Key: s3Key,
  });
  await getS3Client().send(command);
};

export const checkFileExistsInS3 = async ({ s3Key }: { s3Key: string }) => {
  const command = new HeadObjectCommand({
    Bucket: getBucketName(),
    Key: s3Key,
  });
  try {
    await getS3Client().send(command);
    return true;
  } catch (error) {
    if (error instanceof S3ServiceException && error.name === "NotFound") {
      return false;
    }
    throw error;
  }
};

function getS3Key(fileName: string, userId: string) {
  const ext = path.extname(fileName).slice(1);
  return `${userId}/${randomUUID()}.${ext}`;
}
