import { bootstrapApplication } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { Buffer } from 'buffer';
import { provideHttpClient } from '@angular/common/http';
import process from 'process';
import { importProvidersFrom } from '@angular/core';
import { LucideAngularModule, Cog, BanknoteArrowUp, BanknoteArrowDown, Trash2, DollarSign, TicketCheck, Check, Hourglass, Wallet, Send, ShieldCheck, Flag, Copy, FileTextIcon, ChevronDown, ChevronRight, BookOpenCheck, ArrowBigRight, RefreshCcw, SplitIcon, Signature, ShieldEllipsis, CopyPlus, Eraser, GripVertical, Eye, EyeOff, CircleCheck, ShieldBan, CornerUpLeft, Sun, Moon, Inbox } from 'lucide-angular';
import { provideIcons } from '@ng-icons/core';
import {
     heroInformationCircle,
     heroExclamationCircle,
     heroExclamationTriangle,
     heroUsers,
     heroClipboardDocumentList,
     heroArrowDownOnSquareStack,
     heroArrowTopRightOnSquare,
     heroCurrencyDollar,
     heroTrash,
     heroPlusCircle,
     heroPaperAirplane,
     heroTicket,
     heroClock,
     heroQueueList,
     heroArrowUturnLeft,
     heroArrowPath,
     heroUserGroup,
     heroKey,
     heroChartBar,
     heroEye,
     heroEyeSlash,
     heroAdjustmentsVertical,
     heroLockOpen,
     heroLockClosed,
     heroBanknotes,
     heroWallet,
     heroXMark,
     heroXCircle,
     heroCheckCircle,
     heroMoon,
     heroSun,
} from '@ng-icons/heroicons/outline';
import { NgIconsModule } from '@ng-icons/core';
import { featherCheck, featherX, featherAlertCircle, featherChevronDown, featherCheckCircle } from '@ng-icons/feather-icons';

// Make Buffer and process available globally
(globalThis as any).Buffer = Buffer;
(globalThis as any).process = process;

bootstrapApplication(AppComponent, {
     providers: [
          provideRouter(routes),
          provideHttpClient(),
          importProvidersFrom(BrowserAnimationsModule),
          importProvidersFrom(
               LucideAngularModule.pick({
                    Cog,
                    BanknoteArrowUp,
                    BanknoteArrowDown,
                    Trash2,
                    DollarSign,
                    TicketCheck,
                    Check,
                    Hourglass,
                    Wallet,
                    Send,
                    ShieldCheck,
                    Flag,
                    Copy,
                    FileTextIcon,
                    ChevronDown,
                    ChevronRight,
                    BookOpenCheck,
                    ArrowBigRight,
                    RefreshCcw,
                    SplitIcon,
                    Signature,
                    ShieldEllipsis,
                    CopyPlus,
                    Eraser,
                    GripVertical,
                    Eye,
                    EyeOff,
                    CircleCheck,
                    ShieldBan,
                    CornerUpLeft,
                    Sun,
                    Moon,
                    Inbox,
               })
          ),
          importProvidersFrom(
               NgIconsModule.withIcons({
                    featherCheck: featherCheck,
                    featherX: featherX,
                    featherAlertCircle: featherAlertCircle,
                    featherChevronDown: featherChevronDown,
                    featherCheckCircle: featherCheckCircle,
               })
          ),
          provideIcons({
               heroInformationCircle,
               heroExclamationCircle,
               heroExclamationTriangle,
               heroUsers,
               heroClipboardDocumentList,
               heroArrowDownOnSquareStack,
               heroArrowTopRightOnSquare,
               heroCurrencyDollar,
               heroTrash,
               heroPlusCircle,
               heroPaperAirplane,
               heroTicket,
               heroClock,
               heroQueueList,
               heroArrowUturnLeft,
               heroArrowPath,
               heroUserGroup,
               heroKey,
               heroChartBar,
               heroEye,
               heroEyeSlash,
               heroAdjustmentsVertical,
               heroLockOpen,
               heroLockClosed,
               heroBanknotes,
               heroWallet,
               heroXMark,
               heroXCircle,
               heroCheckCircle,
               heroMoon,
               heroSun,
          }),
     ],
}).catch(err => console.error(err));
