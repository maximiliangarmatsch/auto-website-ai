/*
pdf reader and content extracter module.
*/
import { PdfReader, TableParser } from "pdfreader";
import path from "path";
import fs from 'fs';

// Variables for extracting text from PDFs
const nbCols = 2;
const cellPadding = 40;
const columnQuantitizer = (item) => parseFloat(item.x) >= 20;
let allTextData = "";

// Polyfill for String.prototype.padEnd
if (!String.prototype.padEnd) {
    String.prototype.padEnd = function padEnd(targetLength, padString) {
        targetLength = targetLength >> 0;
        padString = String(padString || " ");
        if (this.length > targetLength) {
            return String(this);
        } else {
            targetLength = targetLength - this.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(Math.floor(targetLength / padString.length));
            }
            return String(this) + padString.slice(0, targetLength);
        }
    };
}

// Pads columns in an array to ensure each row has the specified number of columns.
const padColumns = (array, nb) => Array.from({ length: nb }).map((_, i) => array[i] || []);

// Merges cells in a row into a single string.
const mergeCells = (cells) => (cells || []).map((cell) => cell.text).join("");

// Formats a merged cell by trimming and padding its content.
const formatMergedCell = (mergedCell) => {
    if (/^[A-Z\s]+$/.test(mergedCell.trim())) {
        return mergedCell.replace(/\s+/g, "");
    }
    return mergedCell.substr(0, cellPadding).padEnd(cellPadding, "");
};

// Renders a matrix of cells into a formatted string.
const renderMatrix = (matrix) =>
    (matrix || [])
        .map((row) =>
            padColumns(row, nbCols)
                .map(mergeCells)
                .map(formatMergedCell)
        )
        .join("\n");

// Processes a single PDF file, extracting and formatting its text content.
const processFile = (filename) => {
    return new Promise((resolve, reject) => {
        let table = new TableParser();
        new PdfReader().parseFileItems(filename, (err, item) => {
            if (err) {
                reject(err);
            } else if (!item || item.page) {
                let pageText = renderMatrix(table.getMatrix()).replace(/,/g, "");

                // Improve readability by adding space between words, numbers, and handling line breaks
                pageText = pageText.replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space before capital letters
                pageText = pageText.replace(/(\d)([A-Z])/g, '$1 $2');   // Add space after digits before letters
                pageText = pageText.replace(/([a-zA-Z])(\d)/g, '$1 $2'); // Add space after letters before digits

                // Handle specific cases for dates and numbers
                pageText = pageText.replace(/(\d{4})([A-Z])/g, '$1 $2'); // Add space after four digits (year) before letters
                pageText = pageText.replace(/([A-Z])(\d{2})/g, '$1 $2'); // Add space after letters before two digits (day or month)
                pageText = pageText.replace(/(\d)([a-zA-Z])/g, '$1 $2'); // Add space after digits before letters
                
                // Specific patterns to handle common date and number formatting issues
                pageText = pageText.replace(/(\d{1,2})(st|nd|rd|th)([A-Z])/gi, '$1$2 $3'); // Fix dates like 20thDec
                pageText = pageText.replace(/(\d{1,2})([A-Z][a-z]+)/g, '$1 $2'); // Fix dates like 20Dec
                pageText = pageText.replace(/([A-Z][a-z]+)(\d{1,2})/g, '$1 $2'); // Fix dates like Dec20
                pageText = pageText.replace(/([A-Z][a-z]+)(\d{4})/g, '$1 $2'); // Fix years mixing with month names
                pageText = pageText.replace(/(\d)(\$)/g, '$1 $2'); // Fix amounts mixing with dollar signs
                
                allTextData += pageText + "\n";
                if (item?.page) {
                    allTextData += "PAGE: " + item.page + "\n";
                }
                table = new TableParser();
                if (!item) {
                    resolve();
                }
            } else if (item.text) {
                table.processItem(item, columnQuantitizer(item));
            }
        });
    });
};

// Processes all PDF files in a specified folder, extracting and formatting their text content.
export const processAllFiles = async (folderPath) => {
    allTextData = "";
    try {
        const files = await fs.promises.readdir(folderPath);
        const pdfFiles = files.filter((file) => file.endsWith(".pdf"));

        for (const file of pdfFiles) {
            const filePath = path.join(folderPath, file);
            const stat = await fs.promises.stat(filePath);

            if (stat.isFile()) {
                await processFile(filePath);
            }
        }
        return allTextData; 
    } catch (err) {
        console.error("Error processing files:", err);
        throw err;
    }
};
