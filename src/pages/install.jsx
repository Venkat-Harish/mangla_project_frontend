import { useState } from 'react'
import { Button, NoticeBar, Popup, Steps, Toast } from 'antd-mobile'
import { DownlandOutline, SendOutline, UploadOutline } from 'antd-mobile-icons'
import { useInstallPrompt } from '../hooks/index.js'
import { APP_NAME } from '../config.js'

// Install Handi: Chrome's own prompt when it offers one, else the steps for iPhone / Android.
// Used by Profile → Install and by the banner on the Eat home page.
export function useInstallFlow() {
  const { canPrompt, install, isIOS, isAndroid, standalone, installed } = useInstallPrompt()
  const [steps, setSteps] = useState(null) // 'ios' | 'android' | null

  const onInstall = async () => {
    if (standalone) return Toast.show({ content: `${APP_NAME} is already installed` })
    if (canPrompt) return install()
    if (isIOS) return setSteps('ios')
    if (isAndroid) return setSteps('android')
    Toast.show({ content: 'Open this page in Chrome on Android, or Safari on iPhone, to install.' })
  }

  const close = () => setSteps(null)
  const popups = (
    <>
      <Popup visible={steps === 'ios'} onMaskClick={close} showCloseButton onClose={close}>
        <div style={{ padding: '24px 20px 36px' }}>
          <h2 className="h1">Add {APP_NAME} to your Home Screen</h2>
          <p className="muted">Safari doesn’t show an install button, so it takes three taps:</p>
          <Steps direction="vertical" current={3}>
            <Steps.Step status="process" title="Tap Share" description={<span className="row" style={{ gap: 4 }}>The <UploadOutline /> icon in Safari’s toolbar</span>} />
            <Steps.Step status="process" title="Choose “Add to Home Screen”" description="Scroll the share sheet if you don’t see it" />
            <Steps.Step status="process" title="Tap Add" description={<span className="row" style={{ gap: 4 }}>Open {APP_NAME} from its icon <SendOutline /></span>} />
          </Steps>
          <Button block color="primary" size="large" onClick={close}>Got it</Button>
        </div>
      </Popup>

      <Popup visible={steps === 'android'} onMaskClick={close} showCloseButton onClose={close}>
        <div style={{ padding: '24px 20px 36px' }}>
          <h2 className="h1">Install {APP_NAME} from Chrome</h2>
          <p className="muted">Chrome didn’t offer the install pop-up this time, so add it from the menu:</p>
          <Steps direction="vertical" current={3}>
            <Steps.Step status="process" title="Tap ⋮" description="The three-dot menu at the top right of Chrome" />
            <Steps.Step status="process" title="Choose “Install app”" description="On some phones it’s called “Add to Home screen”" />
            <Steps.Step status="process" title="Tap Install" description={<span className="row" style={{ gap: 4 }}>Open {APP_NAME} from its icon <SendOutline /></span>} />
          </Steps>
          <Button block color="primary" size="large" onClick={close}>Got it</Button>
        </div>
      </Popup>
    </>
  )

  return { installed, standalone, canInstallHere: canPrompt || isIOS || isAndroid, onInstall, popups }
}

// × hides the banner for this visit (this tab, reloads included); a new visit or a new sign-in shows it again.
const CLOSED_KEY = 'handi-install-banner-closed'
const closedThisVisit = () => { try { return sessionStorage.getItem(CLOSED_KEY) === '1' } catch { return false } }
export const resetInstallBanner = () => { try { sessionStorage.removeItem(CLOSED_KEY) } catch { /* storage blocked */ } }

export function InstallBanner({ style }) {
  const { installed, canInstallHere, onInstall, popups } = useInstallFlow()
  const [closed, setClosed] = useState(closedThisVisit)
  const close = () => { try { sessionStorage.setItem(CLOSED_KEY, '1') } catch { /* storage blocked */ } setClosed(true) }
  if (installed || !canInstallHere) return null
  return (
    <>
      {!closed && (
        <div className="pad" style={style}>
          <NoticeBar color="info" wrap closeable onClose={close} icon={<DownlandOutline />}
            content={<span onClick={onInstall}>Get the {APP_NAME} app on your home screen — <u>Install</u></span>} />
        </div>
      )}
      {popups}
    </>
  )
}
