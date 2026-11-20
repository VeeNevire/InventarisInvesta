<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

/**
 * The date range a report covers, read from the `dari` and `sampai` query
 * parameters. Defaults to the current month up to today.
 */
final readonly class ReportPeriod
{
    public function __construct(
        public CarbonImmutable $from,
        public CarbonImmutable $to,
    ) {}

    public static function fromRequest(Request $request): self
    {
        $today = CarbonImmutable::today();
        $from = self::parse($request->query('dari')) ?? $today->startOfMonth();
        $to = self::parse($request->query('sampai')) ?? $today;

        if ($to->greaterThan($today)) {
            $to = $today;
        }

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to, $from];
        }

        return new self($from, $to);
    }

    /**
     * @return array{from: string, to: string}
     */
    public function toArray(): array
    {
        return ['from' => $this->from->toDateString(), 'to' => $this->to->toDateString()];
    }

    private static function parse(mixed $value): ?CarbonImmutable
    {
        if (! is_string($value) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return null;
        }

        try {
            return CarbonImmutable::createFromFormat('Y-m-d', $value)?->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }
}
