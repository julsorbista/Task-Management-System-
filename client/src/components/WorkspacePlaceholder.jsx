import { workspaceSnapshot } from '../utils/workspaceSnapshot.js'
import ViewSwitcher from './ViewSwitcher.jsx'

export default function WorkspacePlaceholder({ pageId }) {
  const page = workspaceSnapshot.pages.find((item) => item._id === pageId)
  return (
    <section aria-busy="true" aria-label="Workspace content">
      {pageId && <>
        <div className="task-header">
          <div><div className="small-text">{page?.type === 'shared' ? 'Shared board' : 'Private'}</div>
            <h1 className="page-title">{page?.name || 'Tasks'}</h1></div>
        </div>
        <ViewSwitcher pageId={pageId} />
      </>}
      <div className="workspace-placeholder" aria-hidden="true">
        {[0, 1, 2, 3].map((row) => <div className="workspace-placeholder-row" key={row} />)}
      </div>
    </section>
  )
}
