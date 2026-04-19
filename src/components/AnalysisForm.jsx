import {
  Field,
  InfoBox,
  inputClassName,
  dateTimeInputClassName,
} from "./ui.jsx";

export function AnalysisForm({
  payload,
  errors,
  activeJob,
  socketStatus,
  onFieldChange,
  onReset,
  onSubmit,
}) {
  return (
    <>
      <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em]">Request analysis</h2>
      <p className="mt-2 text-base leading-7 text-stone-600">
        Send a focused incident window to the FastAPI gateway and keep pasted logs plus the
        optional callstack in the main flow so the final review can reference them directly.
      </p>

      <form className="mt-6 grid gap-5" onSubmit={onSubmit}>
        <Field label="Service name" hint="2 to 100 characters" error={errors.service_name}>
          <input
            className={inputClassName}
            name="service_name"
            type="text"
            minLength={2}
            maxLength={100}
            placeholder="payments-api"
            value={payload.service_name}
            onChange={(event) => onFieldChange("service_name", event.target.value)}
            required
          />
        </Field>

        <div className="grid gap-4">
          <Field label="Start time" error={errors.start_ts}>
            <input
              className={dateTimeInputClassName}
              name="start_ts"
              type="datetime-local"
              value={payload.start_ts}
              onChange={(event) => onFieldChange("start_ts", event.target.value)}
              required
            />
          </Field>
          <Field label="End time" error={errors.end_ts}>
            <input
              className={dateTimeInputClassName}
              name="end_ts"
              type="datetime-local"
              value={payload.end_ts}
              onChange={(event) => onFieldChange("end_ts", event.target.value)}
              required
            />
          </Field>
        </div>

        <Field label="Priority" hint="Optional severity hint from 1 to 5">
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((value) => {
              const active = payload.priority === value;
              return (
                <button
                  key={value}
                  type="button"
                  className={[
                    "min-h-12 rounded-2xl border text-base font-semibold transition duration-150",
                    active
                      ? "border-transparent bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-[0_14px_28px_rgba(182,63,24,0.26)]"
                      : "border-stone-300/70 bg-white/80 text-stone-600 hover:-translate-y-0.5 hover:border-orange-300",
                  ].join(" ")}
                  onClick={() => onFieldChange("priority", value)}
                >
                  P{value}
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="Pasted logs"
          hint="Optional, visible by default, and capped at 50,000 characters for incident snippets."
          error={errors.log_text}
        >
          <textarea
            className={`${inputClassName} min-h-64 resize-y font-mono text-[0.92rem] leading-6`}
            name="log_text"
            maxLength={50000}
            placeholder={"ERROR db timeout while processing charge\nWARN retrying request"}
            value={payload.log_text}
            onChange={(event) => onFieldChange("log_text", event.target.value)}
          />
          <div className="mt-2 flex items-center justify-between gap-4 text-sm text-stone-500">
            <span>Pasted logs stay with the latest saved payload.</span>
            <span>{payload.log_text.length}/50000</span>
          </div>
        </Field>

        <Field
          label="Callstack"
          hint="Optional, visible by default, and capped at 20,000 characters for large traces."
          error={errors.callstack}
        >
          <textarea
            className={`${inputClassName} min-h-56 resize-y font-mono text-[0.92rem] leading-6`}
            name="callstack"
            maxLength={20000}
            placeholder={"Traceback (most recent call last):\n  ..."}
            value={payload.callstack}
            onChange={(event) => onFieldChange("callstack", event.target.value)}
          />
          <div className="mt-2 flex items-center justify-between gap-4 text-sm text-stone-500">
            <span>Pasted stack traces stay with the latest saved payload.</span>
            <span>{payload.callstack.length}/20000</span>
          </div>
        </Field>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={activeJob || socketStatus === "connecting"}
            className="rounded-full bg-gradient-to-br from-orange-500 to-orange-700 px-5 py-3 text-sm font-semibold text-orange-50 shadow-[0_14px_28px_rgba(182,63,24,0.26)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none disabled:hover:translate-y-0"
          >
            {activeJob ? "Job in progress" : "Start analysis"}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-stone-300/70 bg-white/84 px-5 py-3 text-sm font-semibold text-stone-900 transition hover:-translate-y-0.5"
          >
            Reset window
          </button>
        </div>

        <InfoBox>
          Submit is disabled while the current socket has an active job. The last payload is
          saved locally as you type.
        </InfoBox>
      </form>
    </>
  );
}
