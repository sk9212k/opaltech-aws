using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Amazon.S3;
using Amazon.S3.Transfer;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace OpalTech.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FileUploadController : ControllerBase
    {
        private readonly IAmazonS3 _s3Client;
        private const string bucketName = "opaltech-raw-data"; // ✅ Your S3 bucket name
        private const long MaxFileSize = 5 * 1024 * 1024; // ✅ 5 MB limit (adjust if needed)

        public FileUploadController(IAmazonS3 s3Client)
        {
            _s3Client = s3Client;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadFile(IFormFile file)
        {
            // 🧠 1️⃣ Basic checks
            if (file == null || file.Length == 0)
                return BadRequest(new { error = "No file uploaded." });

            if (file.Length > MaxFileSize)
                return BadRequest(new { error = $"File too large. Maximum allowed size is {MaxFileSize / (1024 * 1024)} MB." });

            // 🧠 2️⃣ Validate file type
            var allowedExtensions = new[] { ".xml", ".csv", ".json", ".edi" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(extension))
                return BadRequest(new
                {
                    error = "Invalid file type.",
                    allowedTypes = allowedExtensions
                });

            // 🧠 3️⃣ Optional: validate content type (MIME type)
            var allowedMimeTypes = new[]
            {
                "text/xml", "application/xml",
                "text/csv", "application/json",
                "application/edi-x12", "application/octet-stream"
            };

            if (!allowedMimeTypes.Contains(file.ContentType.ToLowerInvariant()))
                return BadRequest(new
                {
                    error = $"Invalid MIME type '{file.ContentType}'.",
                    allowedMimeTypes
                });

            try
            {
                // 🧠 4️⃣ Upload to S3
                using (var newMemoryStream = new MemoryStream())
                {
                    await file.CopyToAsync(newMemoryStream);

                    var uploadRequest = new TransferUtilityUploadRequest
                    {
                        InputStream = newMemoryStream,
                        Key = $"{DateTime.UtcNow:yyyyMMdd_HHmmss}_{file.FileName}",
                        BucketName = bucketName,
                        ContentType = file.ContentType
                    };

                    var transferUtility = new TransferUtility(_s3Client);
                    await transferUtility.UploadAsync(uploadRequest);
                }

                // 🧠 5️⃣ Return structured success
                return Ok(new
                {
                    message = "File validated and uploaded successfully to S3.",
                    fileName = file.FileName,
                    uploadTimeUtc = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                // 🧠 6️⃣ Return structured error
                return StatusCode(500, new
                {
                    error = "Internal server error",
                    details = ex.Message
                });
            }
        }
    }
}
