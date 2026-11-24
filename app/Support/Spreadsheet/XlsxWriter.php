<?php

namespace App\Support\Spreadsheet;

use RuntimeException;
use ZipArchive;

/**
 * Writes a styled .xlsx workbook without third-party packages. Each sheet
 * gets a title block, a table with a coloured header, borders, number
 * formats, a totals row, a frozen header, filters and print settings.
 */
final class XlsxWriter
{
    private const STYLE_TITLE = 1;

    private const STYLE_SUBTITLE = 2;

    private const STYLE_HEADER = 3;

    private const STYLE_TEXT = 4;

    private const STYLE_INT = 5;

    private const STYLE_RUPIAH = 6;

    private const STYLE_PERCENT = 7;

    private const STYLE_SIGNED = 8;

    private const STYLE_TOTAL_TEXT = 9;

    private const STYLE_TOTAL_INT = 10;

    private const STYLE_TOTAL_RUPIAH = 11;

    private const STYLE_TOTAL_PERCENT = 12;

    private const STYLE_TOTAL_SIGNED = 13;

    private const STYLE_GROUP_TEXT = 14;

    private const STYLE_GROUP_RUPIAH = 15;

    private const STYLE_NOTE = 16;

    private const STYLE_BRAND = 17;

    /** @var list<Sheet> */
    private array $sheets = [];

    public function __construct(private readonly string $brand = 'InventarisInvesta') {}

    public function add(Sheet $sheet): self
    {
        $this->sheets[] = $sheet;

        return $this;
    }

    /**
     * Write the workbook to a temporary file and return its path.
     */
    public function save(): string
    {
        $path = tempnam(sys_get_temp_dir(), 'xlsx');

        if ($path === false) {
            throw new RuntimeException('Tidak bisa membuat file sementara.');
        }

        $zip = new ZipArchive;

        if ($zip->open($path, ZipArchive::OVERWRITE) !== true) {
            throw new RuntimeException('Tidak bisa membuat file Excel.');
        }

        $zip->addFromString('[Content_Types].xml', $this->contentTypes());
        $zip->addFromString('_rels/.rels', $this->rootRelationships());
        $zip->addFromString('docProps/app.xml', $this->appProperties());
        $zip->addFromString('docProps/core.xml', $this->coreProperties());
        $zip->addFromString('xl/workbook.xml', $this->workbook());
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->workbookRelationships());
        $zip->addFromString('xl/styles.xml', $this->styles());

        foreach ($this->sheets as $index => $sheet) {
            $zip->addFromString('xl/worksheets/sheet'.($index + 1).'.xml', $this->worksheet($sheet));
        }

        $zip->close();

        return $path;
    }

    private function worksheet(Sheet $sheet): string
    {
        $columnCount = max(1, count($sheet->columns));
        $lastColumn = $this->column($columnCount);
        $rows = [];
        $merges = [];
        $rowNumber = 1;

        $rows[] = $this->rowXml($rowNumber, [[$this->brand, self::STYLE_BRAND]], 16);
        $merges[] = "A{$rowNumber}:{$lastColumn}{$rowNumber}";
        $rowNumber++;

        $rows[] = $this->rowXml($rowNumber, [[$sheet->title, self::STYLE_TITLE]], 26);
        $merges[] = "A{$rowNumber}:{$lastColumn}{$rowNumber}";
        $rowNumber++;

        foreach ($sheet->subtitles as $subtitle) {
            $rows[] = $this->rowXml($rowNumber, [[$subtitle, self::STYLE_SUBTITLE]], 16);
            $merges[] = "A{$rowNumber}:{$lastColumn}{$rowNumber}";
            $rowNumber++;
        }

        $rowNumber++;
        $headerRow = $rowNumber;

        $rows[] = $this->rowXml(
            $rowNumber,
            array_map(fn (array $column): array => [$column['label'], self::STYLE_HEADER], $sheet->columns),
            24,
        );
        $rowNumber++;

        if ($sheet->rows === [] && $sheet->emptyMessage !== null) {
            $rows[] = $this->rowXml($rowNumber, array_merge(
                [[$sheet->emptyMessage, self::STYLE_TEXT]],
                array_fill(0, $columnCount - 1, [null, self::STYLE_TEXT]),
            ));
            $merges[] = "A{$rowNumber}:{$lastColumn}{$rowNumber}";
            $rowNumber++;
        }

        foreach ($sheet->rows as $row) {
            $cells = [];

            foreach ($sheet->columns as $index => $column) {
                $value = $row['values'][$index] ?? null;
                $cells[] = [$value, $row['kind'] === 'group'
                    ? ($column['type'] === 'rupiah' ? self::STYLE_GROUP_RUPIAH : self::STYLE_GROUP_TEXT)
                    : $this->styleFor($column['type'])];
            }

            $rows[] = $this->rowXml($rowNumber, $cells, $row['kind'] === 'group' ? 20 : 18);
            $rowNumber++;
        }

        $lastDataRow = $rowNumber - 1;

        if ($sheet->totals !== null) {
            $cells = [];

            foreach ($sheet->columns as $index => $column) {
                $cells[] = [$sheet->totals[$index] ?? null, $this->totalStyleFor($column['type'])];
            }

            $rows[] = $this->rowXml($rowNumber, $cells, 20);
            $rowNumber++;
        }

        if ($sheet->notes !== []) {
            $rowNumber++;

            foreach ($sheet->notes as $note) {
                $rows[] = $this->rowXml($rowNumber, [[$note, self::STYLE_NOTE]]);
                $merges[] = "A{$rowNumber}:{$lastColumn}{$rowNumber}";
                $rowNumber++;
            }
        }

        $cols = '';

        foreach ($sheet->columns as $index => $column) {
            $position = $index + 1;
            $cols .= sprintf('<col min="%d" max="%d" width="%s" customWidth="1"/>', $position, $position, $column['width']);
        }

        $mergeXml = implode('', array_map(fn (string $range): string => '<mergeCell ref="'.$range.'"/>', $merges));
        $filter = $sheet->rows !== [] ? '<autoFilter ref="A'.$headerRow.':'.$lastColumn.$lastDataRow.'"/>' : '';
        $footer = $this->escape('&L'.$this->brand.' · '.$sheet->title.'&RHalaman &P dari &N');

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>'
            .'<dimension ref="A1:'.$lastColumn.max(1, $rowNumber - 1).'"/>'
            .'<sheetViews><sheetView workbookViewId="0" showGridLines="0" zoomScale="100">'
            .'<pane ySplit="'.$headerRow.'" topLeftCell="A'.($headerRow + 1).'" activePane="bottomLeft" state="frozen"/>'
            .'</sheetView></sheetViews>'
            .'<sheetFormatPr defaultRowHeight="18"/>'
            .'<cols>'.$cols.'</cols>'
            .'<sheetData>'.implode('', $rows).'</sheetData>'
            .$filter
            .'<mergeCells count="'.count($merges).'">'.$mergeXml.'</mergeCells>'
            .'<printOptions horizontalCentered="1"/>'
            .'<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.7" header="0.3" footer="0.3"/>'
            .'<pageSetup paperSize="9" orientation="'.($sheet->landscape ? 'landscape' : 'portrait').'" fitToWidth="1" fitToHeight="0"/>'
            .'<headerFooter><oddFooter>'.$footer.'</oddFooter></headerFooter>'
            .'</worksheet>';
    }

    /**
     * @param  list<array{0: string|int|float|null, 1: int}>  $cells
     */
    private function rowXml(int $row, array $cells, ?float $height = null): string
    {
        $xml = '<row r="'.$row.'"'.($height ? ' ht="'.$height.'" customHeight="1"' : '').'>';

        foreach ($cells as $index => [$value, $style]) {
            $reference = $this->column($index + 1).$row;

            if ($value === null || $value === '') {
                $xml .= '<c r="'.$reference.'" s="'.$style.'"/>';
            } elseif (is_int($value) || is_float($value)) {
                $xml .= '<c r="'.$reference.'" s="'.$style.'"><v>'.$value.'</v></c>';
            } else {
                $xml .= '<c r="'.$reference.'" s="'.$style.'" t="inlineStr"><is><t xml:space="preserve">'.$this->escape($value).'</t></is></c>';
            }
        }

        return $xml.'</row>';
    }

    private function styleFor(string $type): int
    {
        return match ($type) {
            'int' => self::STYLE_INT,
            'rupiah' => self::STYLE_RUPIAH,
            'percent' => self::STYLE_PERCENT,
            'signed' => self::STYLE_SIGNED,
            default => self::STYLE_TEXT,
        };
    }

    private function totalStyleFor(string $type): int
    {
        return match ($type) {
            'int' => self::STYLE_TOTAL_INT,
            'rupiah' => self::STYLE_TOTAL_RUPIAH,
            'percent' => self::STYLE_TOTAL_PERCENT,
            'signed' => self::STYLE_TOTAL_SIGNED,
            default => self::STYLE_TOTAL_TEXT,
        };
    }

    private function column(int $number): string
    {
        $letters = '';

        while ($number > 0) {
            $remainder = ($number - 1) % 26;
            $letters = chr(65 + $remainder).$letters;
            $number = intdiv($number - 1, 26);
        }

        return $letters;
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }

    private function styles(): string
    {
        $border = '<border><left style="thin"><color rgb="FFCBD2DC"/></left><right style="thin"><color rgb="FFCBD2DC"/></right><top style="thin"><color rgb="FFCBD2DC"/></top><bottom style="thin"><color rgb="FFCBD2DC"/></bottom><diagonal/></border>';
        $totalBorder = '<border><left style="thin"><color rgb="FFCBD2DC"/></left><right style="thin"><color rgb="FFCBD2DC"/></right><top style="medium"><color rgb="FF2A38B0"/></top><bottom style="medium"><color rgb="FF2A38B0"/></bottom><diagonal/></border>';

        $xf = fn (int $numFmt, int $font, int $fill, int $border, string $horizontal = 'general', bool $wrap = false): string => sprintf(
            '<xf numFmtId="%d" fontId="%d" fillId="%d" borderId="%d" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="%s" vertical="center"%s/></xf>',
            $numFmt, $font, $fill, $border, $horizontal, $wrap ? ' wrapText="1"' : '',
        );

        $cellXfs = [
            '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
            $xf(0, 2, 0, 0, 'left'),            // 1 title
            $xf(0, 3, 0, 0, 'left'),            // 2 subtitle
            $xf(0, 4, 2, 1, 'center', true),    // 3 header
            $xf(0, 0, 0, 1, 'left', true),      // 4 text
            $xf(165, 0, 0, 1, 'right'),         // 5 int
            $xf(164, 0, 0, 1, 'right'),         // 6 rupiah
            $xf(166, 0, 0, 1, 'right'),         // 7 percent
            $xf(167, 0, 0, 1, 'right'),         // 8 signed
            $xf(0, 1, 4, 2, 'left'),            // 9 total text
            $xf(165, 1, 4, 2, 'right'),         // 10 total int
            $xf(164, 1, 4, 2, 'right'),         // 11 total rupiah
            $xf(166, 1, 4, 2, 'right'),         // 12 total percent
            $xf(167, 1, 4, 2, 'right'),         // 13 total signed
            $xf(0, 1, 3, 1, 'left'),            // 14 group text
            $xf(164, 1, 3, 1, 'right'),         // 15 group rupiah
            $xf(0, 5, 0, 0, 'left', true),      // 16 note
            $xf(0, 6, 0, 0, 'left'),            // 17 brand
        ];

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<numFmts count="4">'
            .'<numFmt numFmtId="164" formatCode="&quot;Rp&quot;#,##0"/>'
            .'<numFmt numFmtId="165" formatCode="#,##0"/>'
            .'<numFmt numFmtId="166" formatCode="0.0%"/>'
            .'<numFmt numFmtId="167" formatCode="+#,##0;-#,##0;0"/>'
            .'</numFmts>'
            .'<fonts count="7">'
            .'<font><sz val="10"/><color rgb="FF1F2937"/><name val="Arial"/><family val="2"/></font>'
            .'<font><b/><sz val="10"/><color rgb="FF111827"/><name val="Arial"/><family val="2"/></font>'
            .'<font><b/><sz val="15"/><color rgb="FF111827"/><name val="Arial"/><family val="2"/></font>'
            .'<font><sz val="10"/><color rgb="FF4B5563"/><name val="Arial"/><family val="2"/></font>'
            .'<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/><family val="2"/></font>'
            .'<font><i/><sz val="9"/><color rgb="FF6B7280"/><name val="Arial"/><family val="2"/></font>'
            .'<font><b/><sz val="10"/><color rgb="FF2A38B0"/><name val="Arial"/><family val="2"/></font>'
            .'</fonts>'
            .'<fills count="5">'
            .'<fill><patternFill patternType="none"/></fill>'
            .'<fill><patternFill patternType="gray125"/></fill>'
            .'<fill><patternFill patternType="solid"><fgColor rgb="FF2A38B0"/><bgColor indexed="64"/></patternFill></fill>'
            .'<fill><patternFill patternType="solid"><fgColor rgb="FFEEF1FD"/><bgColor indexed="64"/></patternFill></fill>'
            .'<fill><patternFill patternType="solid"><fgColor rgb="FFF1F3F7"/><bgColor indexed="64"/></patternFill></fill>'
            .'</fills>'
            .'<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border>'.$border.$totalBorder.'</borders>'
            .'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            .'<cellXfs count="'.count($cellXfs).'">'.implode('', $cellXfs).'</cellXfs>'
            .'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
            .'</styleSheet>';
    }

    private function workbook(): string
    {
        $sheets = '';
        $names = '';

        foreach ($this->sheets as $index => $sheet) {
            $name = $this->escape($this->sheetName($sheet->name));
            $sheets .= '<sheet name="'.$name.'" sheetId="'.($index + 1).'" r:id="rId'.($index + 1).'"/>';
            $headerRow = 4 + count($sheet->subtitles);
            $names .= '<definedName name="_xlnm.Print_Titles" localSheetId="'.$index.'">\''.$name.'\'!$'.$headerRow.':$'.$headerRow.'</definedName>';
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<bookViews><workbookView/></bookViews>'
            .'<sheets>'.$sheets.'</sheets>'
            .'<definedNames>'.$names.'</definedNames>'
            .'</workbook>';
    }

    private function sheetName(string $name): string
    {
        return mb_substr(str_replace(['\\', '/', '?', '*', '[', ']', ':'], '-', $name), 0, 31);
    }

    private function workbookRelationships(): string
    {
        $relationships = '';

        foreach ($this->sheets as $index => $sheet) {
            $relationships .= '<Relationship Id="rId'.($index + 1).'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'.($index + 1).'.xml"/>';
        }

        $relationships .= '<Relationship Id="rId'.(count($this->sheets) + 1).'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'.$relationships.'</Relationships>';
    }

    private function contentTypes(): string
    {
        $overrides = '';

        foreach (array_keys($this->sheets) as $index) {
            $overrides .= '<Override PartName="/xl/worksheets/sheet'.($index + 1).'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            .'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            .'<Default Extension="xml" ContentType="application/xml"/>'
            .'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            .'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            .'<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
            .'<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
            .$overrides
            .'</Types>';
    }

    private function rootRelationships(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            .'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
            .'<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
            .'</Relationships>';
    }

    private function appProperties(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>'.$this->escape($this->brand).'</Application></Properties>';
    }

    private function coreProperties(): string
    {
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $title = $this->escape($this->sheets[0]->title ?? $this->brand);

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
            .'<dc:title>'.$title.'</dc:title><dc:creator>'.$this->escape($this->brand).'</dc:creator>'
            .'<dcterms:created xsi:type="dcterms:W3CDTF">'.$now.'</dcterms:created>'
            .'<dcterms:modified xsi:type="dcterms:W3CDTF">'.$now.'</dcterms:modified>'
            .'</cp:coreProperties>';
    }
}
