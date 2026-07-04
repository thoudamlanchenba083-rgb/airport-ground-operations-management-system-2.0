# -*- coding: utf-8 -*-
"""
Hides Add/Edit/Delete buttons from VIEWER-role users across the AeroGround
frontend (Flights, Airlines, Aircraft, Gates, Baggage tabs).

Run this from your project root:
    python fix_viewer_ui.py

It's safe to run more than once - if a change was already applied, that
particular replacement is simply skipped (reported as "not found - already
applied?" in the log).
"""
import os

BASE = os.path.join("frontend", "src", "components")

def read_text(path):
    with open(path, "rb") as f:
        raw = f.read()
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        # Some files were saved with Windows-1252 (e.g. em dashes from
        # PowerShell's default encoding). Decode with that as a fallback,
        # then we'll always re-save as clean UTF-8 below.
        return raw.decode("cp1252")


def apply_replacements(path, replacements):
    if not os.path.exists(path):
        print(f"[SKIP] File not found: {path}")
        return
    content = read_text(path)

    changed = False
    for i, (old, new) in enumerate(replacements, 1):
        if old in content:
            content = content.replace(old, new)
            changed = True
        else:
            print(f"  [WARN] Replacement #{i} not found in {path} (already applied or file differs?)")

    if changed:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"[OK] Updated {path}")
    else:
        print(f"[--] No changes made to {path}")


# ---------------------------------------------------------------------------
# 1. FlightsTab.jsx
# ---------------------------------------------------------------------------
flights_tab = os.path.join(BASE, "flights", "FlightsTab.jsx")
apply_replacements(flights_tab, [
    (
        "import { useEffect, useState } from 'react'\nimport axiosClient from '../../api/axiosClient'\n\nconst STATUS_COLORS",
        "import { useEffect, useState } from 'react'\nimport axiosClient from '../../api/axiosClient'\nimport { useAuth } from '../../context/AuthContext'\n\nconst STATUS_COLORS",
    ),
    (
        "export default function FlightsTab() {\n  const [flights,   setFlights]   = useState([])",
        "export default function FlightsTab() {\n  const { user } = useAuth()\n  const isViewer = user?.role === 'VIEWER'\n  const [flights,   setFlights]   = useState([])",
    ),
    (
        "        <button\n          onClick={() => setShowForm(!showForm)}\n          className=\"bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition\"\n        >\n          {showForm ? '? Cancel' : '+ Add Flight'}\n        </button>",
        "        {!isViewer && (\n          <button\n            onClick={() => setShowForm(!showForm)}\n            className=\"bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition\"\n          >\n            {showForm ? '? Cancel' : '+ Add Flight'}\n          </button>\n        )}",
    ),
    (
        "                  <th className=\"px-5 py-3\">Status</th>\n                  <th className=\"px-5 py-3\">Actions</th>",
        "                  <th className=\"px-5 py-3\">Status</th>\n                  {!isViewer && <th className=\"px-5 py-3\">Actions</th>}",
    ),
    (
        "                {filtered.length === 0 && (\n                  <tr><td colSpan=\"7\" className=\"px-5 py-6 text-center text-neutral-500\">No flights found</td></tr>\n                )}",
        "                {filtered.length === 0 && (\n                  <tr><td colSpan={isViewer ? 6 : 7} className=\"px-5 py-6 text-center text-neutral-500\">No flights found</td></tr>\n                )}",
    ),
    (
        "                    <td className=\"px-5 py-3\">\n                      <button onClick={() => handleDelete(f.id)} className=\"text-red-500 hover:text-red-700 text-xs font-medium transition\">\n                        Delete\n                      </button>\n                    </td>",
        "                    {!isViewer && (\n                      <td className=\"px-5 py-3\">\n                        <button onClick={() => handleDelete(f.id)} className=\"text-red-500 hover:text-red-700 text-xs font-medium transition\">\n                          Delete\n                        </button>\n                      </td>\n                    )}",
    ),
])

# ---------------------------------------------------------------------------
# 2. AirlinesTab.jsx
# ---------------------------------------------------------------------------
airlines_tab = os.path.join(BASE, "flights", "AirlinesTab.jsx")
apply_replacements(airlines_tab, [
    (
        "import { useEffect, useState } from 'react'\nimport axiosClient from '../../api/axiosClient'\n\nexport default function AirlinesTab() {\n  const [airlines, setAirlines] = useState([])",
        "import { useEffect, useState } from 'react'\nimport axiosClient from '../../api/axiosClient'\nimport { useAuth } from '../../context/AuthContext'\n\nexport default function AirlinesTab() {\n  const { user } = useAuth()\n  const isViewer = user?.role === 'VIEWER'\n  const [airlines, setAirlines] = useState([])",
    ),
    (
        "      <form onSubmit={handleAdd} className=\"bg-neutral-900 rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3 items-end\">\n        <div>\n          <label className=\"block text-xs text-neutral-400 mb-1\">Name</label>\n          <input\n            value={name}\n            onChange={(e) => setName(e.target.value)}\n            required\n            className=\"border rounded px-3 py-2 text-sm\"\n            placeholder=\"e.g. IndiGo\"\n          />\n        </div>\n        <div>\n          <label className=\"block text-xs text-neutral-400 mb-1\">Code</label>\n          <input\n            value={code}\n            onChange={(e) => setCode(e.target.value.toUpperCase())}\n            required\n            className=\"border rounded px-3 py-2 text-sm w-24\"\n            placeholder=\"e.g. 6E\"\n          />\n        </div>\n        <button type=\"submit\" className=\"bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700\">\n          Add Airline\n        </button>\n        {formError && <p className=\"text-red-600 text-xs w-full\">{formError}</p>}\n      </form>",
        "      {!isViewer && (\n        <form onSubmit={handleAdd} className=\"bg-neutral-900 rounded-lg shadow p-4 mb-4 flex flex-wrap gap-3 items-end\">\n          <div>\n            <label className=\"block text-xs text-neutral-400 mb-1\">Name</label>\n            <input\n              value={name}\n              onChange={(e) => setName(e.target.value)}\n              required\n              className=\"border rounded px-3 py-2 text-sm\"\n              placeholder=\"e.g. IndiGo\"\n            />\n          </div>\n          <div>\n            <label className=\"block text-xs text-neutral-400 mb-1\">Code</label>\n            <input\n              value={code}\n              onChange={(e) => setCode(e.target.value.toUpperCase())}\n              required\n              className=\"border rounded px-3 py-2 text-sm w-24\"\n              placeholder=\"e.g. 6E\"\n            />\n          </div>\n          <button type=\"submit\" className=\"bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700\">\n            Add Airline\n          </button>\n          {formError && <p className=\"text-red-600 text-xs w-full\">{formError}</p>}\n        </form>\n      )}",
    ),
    (
        "              <tr>\n                <th className=\"px-4 py-2\">Name</th>\n                <th className=\"px-4 py-2\">Code</th>\n                <th className=\"px-4 py-2 w-20\">Actions</th>\n              </tr>\n            </thead>\n            <tbody>\n              {airlines.length === 0 && (\n                <tr><td colSpan=\"3\" className=\"px-4 py-4 text-neutral-400\">No airlines found</td></tr>\n              )}\n              {airlines.map((a) => (\n                <tr key={a.id} className=\"border-b\">\n                  <td className=\"px-4 py-2\">{a.name}</td>\n                  <td className=\"px-4 py-2\">{a.code}</td>\n                  <td className=\"px-4 py-2\">\n                    <button\n                      onClick={() => handleDelete(a.id)}\n                      className=\"text-red-600 hover:underline text-xs\"\n                    >\n                      Delete\n                    </button>\n                  </td>\n                </tr>\n              ))}",
        "              <tr>\n                <th className=\"px-4 py-2\">Name</th>\n                <th className=\"px-4 py-2\">Code</th>\n                {!isViewer && <th className=\"px-4 py-2 w-20\">Actions</th>}\n              </tr>\n            </thead>\n            <tbody>\n              {airlines.length === 0 && (\n                <tr><td colSpan={isViewer ? 2 : 3} className=\"px-4 py-4 text-neutral-400\">No airlines found</td></tr>\n              )}\n              {airlines.map((a) => (\n                <tr key={a.id} className=\"border-b\">\n                  <td className=\"px-4 py-2\">{a.name}</td>\n                  <td className=\"px-4 py-2\">{a.code}</td>\n                  {!isViewer && (\n                    <td className=\"px-4 py-2\">\n                      <button\n                        onClick={() => handleDelete(a.id)}\n                        className=\"text-red-600 hover:underline text-xs\"\n                      >\n                        Delete\n                      </button>\n                    </td>\n                  )}\n                </tr>\n              ))}",
    ),
])

# ---------------------------------------------------------------------------
# 3. AircraftTab.jsx
# ---------------------------------------------------------------------------
aircraft_tab = os.path.join(BASE, "flights", "AircraftTab.jsx")
apply_replacements(aircraft_tab, [
    (
        "import { useEffect, useState } from 'react'\nimport axiosClient from '../../api/axiosClient'\n\nexport default function AircraftTab() {\n  const [aircraft,  setAircraft]  = useState([])",
        "import { useEffect, useState } from 'react'\nimport axiosClient from '../../api/axiosClient'\nimport { useAuth } from '../../context/AuthContext'\n\nexport default function AircraftTab() {\n  const { user } = useAuth()\n  const isViewer = user?.role === 'VIEWER'\n  const [aircraft,  setAircraft]  = useState([])",
    ),
    (
        "      <div className=\"flex justify-end\">\n        <button\n          onClick={() => setShowForm(!showForm)}\n          className=\"bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition\"\n        >\n          {showForm ? '? Cancel' : '+ Add Aircraft'}\n        </button>\n      </div>",
        "      <div className=\"flex justify-end\">\n        {!isViewer && (\n          <button\n            onClick={() => setShowForm(!showForm)}\n            className=\"bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition\"\n          >\n            {showForm ? '? Cancel' : '+ Add Aircraft'}\n          </button>\n        )}\n      </div>",
    ),
    (
        "                <th className=\"px-5 py-3\">Capacity</th>\n                <th className=\"px-5 py-3\">Actions</th>\n              </tr>\n            </thead>\n            <tbody className=\"divide-y divide-neutral-800\">\n              {aircraft.length === 0 && (\n                <tr><td colSpan=\"4\" className=\"px-5 py-6 text-center text-neutral-500\">No aircraft found</td></tr>\n              )}\n              {aircraft.map(a => (\n                <tr key={a.id} className=\"hover:bg-neutral-800 transition\">\n                  <td className=\"px-5 py-3 font-mono font-semibold text-blue-700\">{a.registration_number}</td>\n                  <td className=\"px-5 py-3 text-neutral-100\">{a.aircraft_type}</td>\n                  <td className=\"px-5 py-3 text-neutral-300\">{a.capacity} seats</td>\n                  <td className=\"px-5 py-3\">\n                    <button onClick={() => handleDelete(a.id)} className=\"text-red-500 hover:text-red-700 text-xs font-medium transition\">\n                      Delete\n                    </button>\n                  </td>\n                </tr>\n              ))}",
        "                <th className=\"px-5 py-3\">Capacity</th>\n                {!isViewer && <th className=\"px-5 py-3\">Actions</th>}\n              </tr>\n            </thead>\n            <tbody className=\"divide-y divide-neutral-800\">\n              {aircraft.length === 0 && (\n                <tr><td colSpan={isViewer ? 3 : 4} className=\"px-5 py-6 text-center text-neutral-500\">No aircraft found</td></tr>\n              )}\n              {aircraft.map(a => (\n                <tr key={a.id} className=\"hover:bg-neutral-800 transition\">\n                  <td className=\"px-5 py-3 font-mono font-semibold text-blue-700\">{a.registration_number}</td>\n                  <td className=\"px-5 py-3 text-neutral-100\">{a.aircraft_type}</td>\n                  <td className=\"px-5 py-3 text-neutral-300\">{a.capacity} seats</td>\n                  {!isViewer && (\n                    <td className=\"px-5 py-3\">\n                      <button onClick={() => handleDelete(a.id)} className=\"text-red-500 hover:text-red-700 text-xs font-medium transition\">\n                        Delete\n                      </button>\n                    </td>\n                  )}\n                </tr>\n              ))}",
    ),
])

# ---------------------------------------------------------------------------
# 4. GatesTab.jsx
# ---------------------------------------------------------------------------
gates_tab = os.path.join(BASE, "gates", "GatesTab.jsx")
apply_replacements(gates_tab, [
    (
        "import { useEffect, useState } from 'react'\nimport axiosClient from '../../api/axiosClient'\n\nexport default function GatesTab() {\n  const [gates, setGates] = useState([])",
        "import { useEffect, useState } from 'react'\nimport axiosClient from '../../api/axiosClient'\nimport { useAuth } from '../../context/AuthContext'\n\nexport default function GatesTab() {\n  const { user } = useAuth()\n  const isViewer = user?.role === 'VIEWER'\n  const [gates, setGates] = useState([])",
    ),
    (
        "        <button\n          onClick={() => setShowForm(v => !v)}\n          className=\"bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg\"\n        >\n          {showForm ? 'Cancel' : '+ Add Gate'}\n        </button>",
        "        {!isViewer && (\n          <button\n            onClick={() => setShowForm(v => !v)}\n            className=\"bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg\"\n          >\n            {showForm ? 'Cancel' : '+ Add Gate'}\n          </button>\n        )}",
    ),
    (
        "              <th className=\"px-4 py-3 text-left\">Status</th>\n              <th className=\"px-4 py-3 text-left\">Actions</th>\n            </tr>\n          </thead>\n          <tbody className=\"divide-y divide-neutral-800 bg-neutral-900\">\n            {filtered.length === 0 ? (\n              <tr><td colSpan={4} className=\"text-center text-neutral-500 py-6\">No gates found.</td></tr>\n            ) : filtered.map(g => (",
        "              <th className=\"px-4 py-3 text-left\">Status</th>\n              {!isViewer && <th className=\"px-4 py-3 text-left\">Actions</th>}\n            </tr>\n          </thead>\n          <tbody className=\"divide-y divide-neutral-800 bg-neutral-900\">\n            {filtered.length === 0 ? (\n              <tr><td colSpan={isViewer ? 3 : 4} className=\"text-center text-neutral-500 py-6\">No gates found.</td></tr>\n            ) : filtered.map(g => (",
    ),
    (
        "                <td className=\"px-4 py-3 flex gap-2\">\n                  <button\n                    onClick={() => toggleAvailability(g)}\n                    className=\"text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded\"\n                  >\n                    Toggle\n                  </button>\n                  <button\n                    onClick={() => deleteGate(g.id)}\n                    className=\"text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded\"\n                  >\n                    Delete\n                  </button>\n                </td>",
        "                {!isViewer && (\n                  <td className=\"px-4 py-3 flex gap-2\">\n                    <button\n                      onClick={() => toggleAvailability(g)}\n                      className=\"text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded\"\n                    >\n                      Toggle\n                    </button>\n                    <button\n                      onClick={() => deleteGate(g.id)}\n                      className=\"text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded\"\n                    >\n                      Delete\n                    </button>\n                  </td>\n                )}",
    ),
])

# ---------------------------------------------------------------------------
# 5. BaggageTab.jsx
# ---------------------------------------------------------------------------
baggage_tab = os.path.join(BASE, "baggage", "BaggageTab.jsx")
apply_replacements(baggage_tab, [
    (
        "import { useEffect, useState } from 'react'\nimport axiosClient from '../../api/axiosClient'\n\nconst STATUS_COLORS = {",
        "import { useEffect, useState } from 'react'\nimport axiosClient from '../../api/axiosClient'\nimport { useAuth } from '../../context/AuthContext'\n\nconst STATUS_COLORS = {",
    ),
    (
        "export default function BaggageTab() {\n  const [baggage,   setBaggage]   = useState([])",
        "export default function BaggageTab() {\n  const { user } = useAuth()\n  const isViewer = user?.role === 'VIEWER'\n  const [baggage,   setBaggage]   = useState([])",
    ),
    (
        "            {/* Add tracking form */}\n            <div className=\"bg-neutral-800 border border-neutral-700 rounded-lg p-3 mb-4 space-y-2\">\n              <select\n                value={trackForm.status}\n                onChange={e => setTrackForm(f => ({ ...f, status: e.target.value }))}\n                className=\"w-full border border-gray-300 rounded px-3 py-2 text-sm\"\n              >\n                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}\n              </select>\n              <input\n                placeholder=\"Location\"\n                value={trackForm.location}\n                onChange={e => setTrackForm(f => ({ ...f, location: e.target.value }))}\n                className=\"w-full border border-gray-300 rounded px-3 py-2 text-sm\"\n              />\n              <textarea\n                placeholder=\"Notes (optional)\"\n                value={trackForm.notes}\n                onChange={e => setTrackForm(f => ({ ...f, notes: e.target.value }))}\n                className=\"w-full border border-gray-300 rounded px-3 py-2 text-sm\"\n                rows={2}\n              />\n              <button\n                onClick={addTracking}\n                className=\"w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg\"\n              >\n                Add Update\n              </button>\n            </div>",
        "            {/* Add tracking form */}\n            {!isViewer && (\n              <div className=\"bg-neutral-800 border border-neutral-700 rounded-lg p-3 mb-4 space-y-2\">\n                <select\n                  value={trackForm.status}\n                  onChange={e => setTrackForm(f => ({ ...f, status: e.target.value }))}\n                  className=\"w-full border border-gray-300 rounded px-3 py-2 text-sm\"\n                >\n                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}\n                </select>\n                <input\n                  placeholder=\"Location\"\n                  value={trackForm.location}\n                  onChange={e => setTrackForm(f => ({ ...f, location: e.target.value }))}\n                  className=\"w-full border border-gray-300 rounded px-3 py-2 text-sm\"\n                />\n                <textarea\n                  placeholder=\"Notes (optional)\"\n                  value={trackForm.notes}\n                  onChange={e => setTrackForm(f => ({ ...f, notes: e.target.value }))}\n                  className=\"w-full border border-gray-300 rounded px-3 py-2 text-sm\"\n                  rows={2}\n                />\n                <button\n                  onClick={addTracking}\n                  className=\"w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg\"\n                >\n                  Add Update\n                </button>\n              </div>\n            )}",
    ),
    (
        "        <button\n          onClick={() => setShowForm(v => !v)}\n          className=\"bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg\"\n        >\n          {showForm ? 'Cancel' : '+ Add Baggage'}\n        </button>\n      </div>\n\n      {/* Add form */}\n      {showForm && (",
        "        {!isViewer && (\n          <button\n            onClick={() => setShowForm(v => !v)}\n            className=\"bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg\"\n          >\n            {showForm ? 'Cancel' : '+ Add Baggage'}\n          </button>\n        )}\n      </div>\n\n      {/* Add form */}\n      {showForm && !isViewer && (",
    ),
    (
        "                <td className=\"px-4 py-3 flex gap-2\">\n                  <button\n                    onClick={() => loadTracking(b)}\n                    className=\"text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded\"\n                  >\n                    Tracking\n                  </button>\n                  <button\n                    onClick={() => deleteBaggage(b.id)}\n                    className=\"text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded\"\n                  >\n                    Delete\n                  </button>\n                </td>",
        "                <td className=\"px-4 py-3 flex gap-2\">\n                  <button\n                    onClick={() => loadTracking(b)}\n                    className=\"text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded\"\n                  >\n                    Tracking\n                  </button>\n                  {!isViewer && (\n                    <button\n                      onClick={() => deleteBaggage(b.id)}\n                      className=\"text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded\"\n                    >\n                      Delete\n                    </button>\n                  )}\n                </td>",
    ),
])

print("\nDone. Restart your Vite dev server (npm run dev) and log in as a VIEWER account to verify.")
