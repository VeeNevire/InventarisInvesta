<?php

namespace App\Support\Spreadsheet;

/**
 * One worksheet: a title block, a single bordered table and optional notes.
 *
 * Column types decide the cell format: `text`, `int`, `rupiah`, `percent`
 * (a fraction, 0.25 = 25%) and `signed` (shows +/- for adjustments).
 */
final class Sheet
{
    /** @var list<string> */
    public array $subtitles = [];

    /** @var list<array{label: string, width: float, type: string}> */
    public array $columns = [];

    /** @var list<array{kind: 'row'|'group', values: list<string|int|float|null>}> */
    public array $rows = [];

    /** @var list<string|int|float|null>|null */
    public ?array $totals = null;

    /** @var list<string> */
    public array $notes = [];

    public bool $landscape = false;

    public function __construct(
        public readonly string $name,
        public readonly string $title,
    ) {}

    public function subtitle(string $text): self
    {
        $this->subtitles[] = $text;

        return $this;
    }

    /**
     * @param  list<array{0: string, 1: float|int, 2?: string}>  $columns  label, width, type
     */
    public function columns(array $columns): self
    {
        $this->columns = array_map(fn (array $column): array => [
            'label' => $column[0],
            'width' => (float) $column[1],
            'type' => $column[2] ?? 'text',
        ], $columns);

        return $this;
    }

    /**
     * @param  list<string|int|float|null>  $values
     */
    public function row(array $values): self
    {
        $this->rows[] = ['kind' => 'row', 'values' => $values];

        return $this;
    }

    /**
     * A shaded row spanning the table, used to group the rows below it.
     *
     * @param  list<string|int|float|null>  $values
     */
    public function group(array $values): self
    {
        $this->rows[] = ['kind' => 'group', 'values' => $values];

        return $this;
    }

    /**
     * @param  list<string|int|float|null>  $values
     */
    public function totals(array $values): self
    {
        $this->totals = $values;

        return $this;
    }

    public function note(string $text): self
    {
        $this->notes[] = $text;

        return $this;
    }

    public function landscape(): self
    {
        $this->landscape = true;

        return $this;
    }
}
