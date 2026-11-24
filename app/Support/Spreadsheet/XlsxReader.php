<?php

namespace App\Support\Spreadsheet;

use RuntimeException;
use SimpleXMLElement;
use ZipArchive;

/**
 * Reads the cell values of the first worksheet in an .xlsx file without
 * third-party packages. Values come back as trimmed strings (numbers in
 * their stored form, e.g. "12" or "1500.5"); empty cells are null.
 */
final class XlsxReader
{
    private const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

    private const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

    /**
     * @return list<list<string|null>> Rows in sheet order; each row is indexed from column A = 0.
     *
     * @throws RuntimeException When the file is not a readable workbook.
     */
    public function firstSheet(string $path): array
    {
        $zip = new ZipArchive;

        if ($zip->open($path, ZipArchive::RDONLY) !== true) {
            throw new RuntimeException('File tidak bisa dibaca. Pastikan file berformat Excel (.xlsx).');
        }

        try {
            $sheetXml = $this->xml($zip, $this->firstSheetPath($zip));
            $sharedStrings = $this->sharedStrings($zip);
        } finally {
            $zip->close();
        }

        $sheetXml->registerXPathNamespace('m', self::MAIN_NS);
        $rows = [];

        foreach ($sheetXml->xpath('//m:sheetData/m:row') ?: [] as $rowXml) {
            $rowNumber = (int) $rowXml->attributes()['r'] ?: count($rows) + 1;
            $cells = [];
            $position = 0;

            foreach ($rowXml->children(self::MAIN_NS)->c as $cell) {
                $reference = (string) $cell->attributes()['r'];
                $position = $reference !== '' ? $this->columnIndex($reference) : $position;
                $cells[$position] = $this->cellValue($cell, $sharedStrings);
                $position++;
            }

            $rows[$rowNumber] = $cells;
        }

        if ($rows === []) {
            return [];
        }

        $width = max(array_map(fn (array $cells): int => $cells === [] ? 0 : max(array_keys($cells)) + 1, $rows));
        $result = [];

        for ($row = 1, $last = max(array_keys($rows)); $row <= $last; $row++) {
            $cells = $rows[$row] ?? [];
            $result[] = array_map(fn (int $column): ?string => $cells[$column] ?? null, range(0, max(0, $width - 1)));
        }

        return $result;
    }

    private function firstSheetPath(ZipArchive $zip): string
    {
        $workbook = $this->xml($zip, 'xl/workbook.xml');
        $sheet = $workbook->children(self::MAIN_NS)->sheets->sheet[0] ?? null;

        if ($sheet === null) {
            throw new RuntimeException('File Excel tidak berisi sheet.');
        }

        $relationshipId = (string) $sheet->attributes(self::REL_NS)['id'];
        $relationships = $this->xml($zip, 'xl/_rels/workbook.xml.rels');

        foreach ($relationships->children() as $relationship) {
            if ((string) $relationship->attributes()['Id'] === $relationshipId) {
                $target = ltrim((string) $relationship->attributes()['Target'], '/');

                return str_starts_with($target, 'xl/') ? $target : 'xl/'.$target;
            }
        }

        return 'xl/worksheets/sheet1.xml';
    }

    /**
     * @return list<string>
     */
    private function sharedStrings(ZipArchive $zip): array
    {
        if ($zip->locateName('xl/sharedStrings.xml') === false) {
            return [];
        }

        $strings = [];

        foreach ($this->xml($zip, 'xl/sharedStrings.xml')->children(self::MAIN_NS)->si as $item) {
            $strings[] = $this->richText($item);
        }

        return $strings;
    }

    /**
     * @param  list<string>  $sharedStrings
     */
    private function cellValue(SimpleXMLElement $cell, array $sharedStrings): ?string
    {
        $children = $cell->children(self::MAIN_NS);

        $value = match ((string) $cell->attributes()['t']) {
            's' => $sharedStrings[(int) $children->v] ?? '',
            'inlineStr' => $this->richText($children->is),
            'b' => (string) $children->v === '1' ? 'TRUE' : 'FALSE',
            default => (string) $children->v,
        };

        $value = trim($value);

        return $value === '' ? null : $value;
    }

    /**
     * Join the text runs of a string item (plain `<t>` or rich `<r><t>`).
     */
    private function richText(?SimpleXMLElement $item): string
    {
        if ($item === null) {
            return '';
        }

        $children = $item->children(self::MAIN_NS);

        if (isset($children->t)) {
            return (string) $children->t;
        }

        $text = '';

        foreach ($children->r as $run) {
            $text .= (string) $run->children(self::MAIN_NS)->t;
        }

        return $text;
    }

    /**
     * Zero-based column index of a cell reference such as "C12" or "AA3".
     */
    private function columnIndex(string $reference): int
    {
        $letters = strtoupper((string) preg_replace('/[^A-Za-z]/', '', $reference));
        $index = 0;

        foreach (str_split($letters) as $letter) {
            $index = $index * 26 + (ord($letter) - 64);
        }

        return max(0, $index - 1);
    }

    private function xml(ZipArchive $zip, string $name): SimpleXMLElement
    {
        $contents = $zip->getFromName($name);

        if ($contents === false) {
            throw new RuntimeException('File Excel tidak lengkap atau rusak.');
        }

        $previous = libxml_use_internal_errors(true);

        try {
            $xml = simplexml_load_string($contents, SimpleXMLElement::class, LIBXML_NONET);
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }

        if ($xml === false) {
            throw new RuntimeException('File Excel rusak dan tidak bisa dibaca.');
        }

        return $xml;
    }
}
